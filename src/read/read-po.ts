import { extractTextItems, getDocumentProxy } from 'unpdf'
import { requestedDate, toTrackerDate } from '../domain/dates'
import type { ReadResult, TrackerRow } from '../domain/types'

type TextRun = {
  str: string
  x: number
  y: number
  width: number
}

type VisualLine = {
  y: number
  page: number
  items: TextRun[]
}

const PR_RE = /^\d{10}$/
const REV_RE = /^\d{2}$/

function isPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
}

export async function readPo(file: string, bytes: Uint8Array): Promise<ReadResult> {
  if (!isPdf(bytes)) return { file, kind: 'issue', issue: 'not-pdf' }

  let items: TextRun[][]
  try {
    const pdf = await getDocumentProxy(bytes)
    ;({ items } = await extractTextItems(pdf))
  } catch {
    return { file, kind: 'issue', issue: 'not-pdf' }
  }

  const runCount = items.reduce((n, page) => n + page.filter((item) => item.str.trim()).length, 0)
  if (runCount === 0) return { file, kind: 'issue', issue: 'no-text' }

  const pages = items.map((pageItems, page) => groupLines(pageItems, page))
  const lines = pages.flat()
  const columnsByPage = pages.map(pageColumns)

  const poNumber = valueRightOf(lines, 'Document Number') ?? ''
  const poDate = toTrackerDate(valueRightOf(lines, 'Document Date'))
  const starts = lineItemStarts(lines)
  if (!poNumber && starts.length === 0) return { file, kind: 'issue', issue: 'not-aem' }

  const rows: TrackerRow[] = []
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i]
    const end = i + 1 < starts.length ? starts[i + 1] : lines.length
    const block = lines.slice(start, end)
    const head = lines[start]
    const cols = columnsByPage[head.page]
    rows.push(rowFromBlock(poNumber, poDate, head, block, cols))
  }

  rows.sort((a, b) => a.line - b.line)
  return { file, kind: 'rows', rows }
}

function groupLines(pageItems: TextRun[], page: number): VisualLine[] {
  const lines: VisualLine[] = []
  for (const item of pageItems) {
    const str = item.str.trim()
    if (!str) continue
    const run: TextRun = { str, x: item.x, y: item.y, width: item.width }
    const line = lines.find((l) => Math.abs(l.y - run.y) < 2)
    if (line) line.items.push(run)
    else lines.push({ y: run.y, page, items: [run] })
  }
  lines.sort((a, b) => b.y - a.y)
  for (const line of lines) line.items.sort((a, b) => a.x - b.x)
  return lines
}

function joined(line: VisualLine): string {
  return line.items.map((item) => item.str).join(' ')
}

function valueRightOf(lines: VisualLine[], label: string): string | undefined {
  for (const line of lines) {
    const idx = line.items.findIndex((item) => item.str === label)
    if (idx >= 0) {
      const next = line.items[idx + 1]?.str
      if (next) return next
    }
    const prefixed = line.items.find((item) => item.str.startsWith(`${label} `) || item.str.startsWith(`${label}:`))
    if (prefixed) {
      const rest = prefixed.str.slice(label.length).replace(/^[:\s]+/, '').trim()
      if (rest) return rest.split(/\s+/)[0]
    }
    const match = joined(line).match(new RegExp(`${escapeRe(label)}[:\\s]+(\\S+)`))
    if (match) return match[1]
  }
}

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null
  const n = Number(value.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

type PageColumns = {
  quantity: number
  uom: number
  unitPrice: number
  discount: number
  amount: number
} | null

function pageColumns(lines: VisualLine[]): PageColumns {
  const head = lines.find((line) => line.items.some((item) => item.str === 'Quantity'))
  if (!head) return null
  const xOf = (name: string) => head.items.find((item) => item.str === name)?.x
  const quantity = xOf('Quantity')
  const uom = xOf('UOM')
  const unitPrice = xOf('Unit Price')
  const discount = xOf('Discount')
  const amount = xOf('Amount')
  if (quantity == null || uom == null || unitPrice == null || discount == null || amount == null) return null
  return { quantity, uom, unitPrice, discount, amount }
}

function inCol(line: VisualLine, cols: PageColumns, start: keyof Exclude<PageColumns, null>, next?: keyof Exclude<PageColumns, null>): string | undefined {
  if (!cols) return
  const minX = cols[start] - 5
  const maxX = next ? cols[next] - 5 : Infinity
  return line.items.find((item) => item.x >= minX && item.x < maxX)?.str
}

function lineItemStarts(lines: VisualLine[]): number[] {
  const starts: number[] = []
  lines.forEach((line, idx) => {
    const first = line.items[0]?.str
    if (first && PR_RE.test(first) && line.items[1]) starts.push(idx)
  })
  return starts
}

function blockText(block: VisualLine[], label: string): string {
  const prefix = label.endsWith(':') ? label : `${label}:`
  for (const line of block) {
    for (const item of line.items) {
      if (item.str === prefix || item.str === label) {
        const next = line.items.find((other) => other.x > item.x)
        if (next) return next.str
      }
      if (item.str.startsWith(prefix)) {
        return fieldValue(label, item.str.slice(prefix.length).trim())
      }
    }
    const joinedLine = joined(line)
    const idx = joinedLine.indexOf(prefix)
    if (idx >= 0) return fieldValue(label, joinedLine.slice(idx + prefix.length).trim())
  }
  return ''
}

function fieldValue(label: string, value: string): string {
  if (label === 'EIN#:' || label === 'Date Required:') return value.split(/\s+/)[0] ?? ''
  return value
}

function blockRev(block: VisualLine[]): string {
  const mpnLine = block.find((line) => line.items.some((item) => item.str.includes('MPN/Dwg No:')) || joined(line).includes('MPN/Dwg No:'))
  if (!mpnLine) return ''
  const mpnItem = mpnLine.items.find((item) => item.str.includes('MPN/Dwg No:'))
  if (mpnItem) {
    const right = mpnLine.items.find((item) => item.x >= mpnItem.x + mpnItem.width - 0.5 && REV_RE.test(item.str))
    if (right) return right.str
  }
  const match = joined(mpnLine).match(/MPN\/Dwg No:\s*\S+\s+(\d{2})(?:\s|$)/)
  return match?.[1] ?? ''
}

function rowFromBlock(
  poNumber: string,
  poDate: string,
  head: VisualLine,
  block: VisualLine[],
  cols: PageColumns,
): TrackerRow {
  const line = Number(head.items[1]?.str)
  const project = blockText(block, 'EIN#:')
  const rev = blockRev(block)
  const description = blockText(block, 'Part Name:')
  const requestedRaw = blockText(block, 'Date Required:')
  const { value: requested, flag: requestedFlag } = requestedDate(requestedRaw)
  const flags: TrackerRow['flags'] = []
  if (!project) flags.push('project')
  if (!rev) flags.push('rev')
  if (requestedFlag) flags.push('requested')
  return {
    job: '',
    drawing: '',
    pur: '',
    poDate,
    poNumber,
    line,
    project,
    rev,
    description,
    qty: parseNumber(inCol(head, cols, 'quantity', 'uom')),
    unitPrice: parseNumber(inCol(head, cols, 'unitPrice', 'discount')),
    total: parseNumber(inCol(head, cols, 'amount')),
    requested,
    flags,
  }
}
