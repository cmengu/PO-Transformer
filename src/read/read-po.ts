import { extractTextItems, getDocumentProxy } from 'unpdf'
import { OPS } from 'unpdf/pdfjs'
import { parseDateField } from '../domain/dates'
import type { ParsedDateField } from '../domain/dates'
import type { ObscuredPriceField, ReadResult, TrackerRow } from '../domain/types'

type TextRun = {
  str: string
  x: number
  y: number
  width: number
  height: number
}

type VisualLine = {
  y: number
  page: number
  items: TextRun[]
}

const PR_RE = /^\d{10}$/
const LINE_RE = /^\d+$/
const REV_RE = /^\d{2}$/

type Matrix = [number, number, number, number, number, number]

type Bounds = {
  left: number
  right: number
  bottom: number
  top: number
}

type PageVisuals = {
  imageOverlays: Array<Bounds & { operationIndex: number }>
  lastTextOperation: Map<string, number>
}

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]
const IMAGE_OPERATIONS = new Set([
  OPS.paintImageMaskXObject,
  OPS.paintImageMaskXObjectGroup,
  OPS.paintImageXObject,
  OPS.paintInlineImageXObject,
  OPS.paintInlineImageXObjectGroup,
  OPS.paintImageXObjectRepeat,
  OPS.paintImageMaskXObjectRepeat,
  OPS.paintSolidColorImageMask,
])

function multiplyMatrices(left: Matrix, right: Matrix): Matrix {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ]
}

function boundsForUnitSquare(matrix: Matrix): Bounds {
  const points = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => [
    matrix[0] * x + matrix[2] * y + matrix[4],
    matrix[1] * x + matrix[3] * y + matrix[5],
  ])
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    bottom: Math.min(...ys),
    top: Math.max(...ys),
  }
}

function shownText(args: unknown): string {
  const glyphs = Array.isArray(args) ? args[0] : undefined
  if (!Array.isArray(glyphs)) return ''
  return glyphs
    .map((glyph) => (
      typeof glyph === 'object' && glyph != null && 'unicode' in glyph
        ? String(glyph.unicode ?? '')
        : ''
    ))
    .join('')
    .trim()
}

async function readPageVisuals(pdf: Awaited<ReturnType<typeof getDocumentProxy>>, pageNumber: number): Promise<PageVisuals> {
  const page = await pdf.getPage(pageNumber)
  const operators = await page.getOperatorList()
  const imageOverlays: PageVisuals['imageOverlays'] = []
  const lastTextOperation = new Map<string, number>()
  const transforms: Matrix[] = []
  let transform: Matrix = [...IDENTITY]

  operators.fnArray.forEach((operation, index) => {
    const args = operators.argsArray[index]
    if (operation === OPS.save) {
      transforms.push([...transform])
    } else if (operation === OPS.restore) {
      transform = transforms.pop() ?? [...IDENTITY]
    } else if (operation === OPS.transform) {
      const next = Array.isArray(args) ? args : []
      if (next.length === 6 && next.every((value) => typeof value === 'number')) {
        transform = multiplyMatrices(transform, next as Matrix)
      }
    } else if (operation === OPS.showText) {
      const text = shownText(args)
      if (text) lastTextOperation.set(text, index)
    } else if (IMAGE_OPERATIONS.has(operation)) {
      imageOverlays.push({ ...boundsForUnitSquare(transform), operationIndex: index })
    }
  })

  return { imageOverlays, lastTextOperation }
}

function isCoveredByLaterImage(run: TextRun | undefined, visuals: PageVisuals | undefined): boolean {
  if (!run || !visuals || run.width <= 0 || run.height <= 0) return false
  const textOperation = visuals.lastTextOperation.get(run.str)
  if (textOperation == null) return false
  return visuals.imageOverlays.some((overlay) => {
    if (overlay.operationIndex <= textOperation) return false
    const horizontal = Math.max(0, Math.min(run.x + run.width, overlay.right) - Math.max(run.x, overlay.left))
    const vertical = Math.max(0, Math.min(run.y + run.height, overlay.top) - Math.max(run.y, overlay.bottom))
    return horizontal / run.width >= 0.8 && vertical / run.height >= 0.8
  })
}

function isPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
}

export async function readPo(file: string, bytes: Uint8Array): Promise<ReadResult> {
  if (!isPdf(bytes)) return { file, kind: 'issue', issue: 'not-pdf' }

  let items: TextRun[][]
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>
  try {
    pdf = await getDocumentProxy(bytes)
    ;({ items } = await extractTextItems(pdf))
  } catch {
    return { file, kind: 'issue', issue: 'not-pdf' }
  }

  const runCount = items.reduce((n, page) => n + page.filter((item) => item.str.trim()).length, 0)
  if (runCount === 0) return { file, kind: 'issue', issue: 'no-text' }

  const pages = items.map((pageItems, page) => groupLines(pageItems, page))
  const lines = pages.flat()
  const columnsByPage = pages.map(pageColumns)
  const pageVisuals = await Promise.all(
    pages.map((_, page) => readPageVisuals(pdf, page + 1)),
  )

  const poNumber = valueRightOf(lines, 'Document Number') ?? ''
  const poDate = parseDateField(valueRightOf(lines, 'Document Date'))
  const starts = lineItemStarts(lines)
  if (!poNumber || starts.length === 0) return { file, kind: 'issue', issue: 'not-aem' }

  const rows: TrackerRow[] = []
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i]
    const end = i + 1 < starts.length ? starts[i + 1] : lines.length
    const block = lines.slice(start, end)
    const head = lines[start]
    const cols = columnsByPage[head.page]
    rows.push(rowFromBlock(poNumber, poDate, head, block, cols, pageVisuals[head.page]))
  }

  rows.sort((a, b) => a.line - b.line)
  return { file, kind: 'rows', rows }
}

function groupLines(pageItems: TextRun[], page: number): VisualLine[] {
  const lines: VisualLine[] = []
  for (const item of pageItems) {
    const str = item.str.trim()
    if (!str) continue
    const run: TextRun = {
      str,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height || 8,
    }
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

function inCol(line: VisualLine, cols: PageColumns, start: keyof Exclude<PageColumns, null>, next?: keyof Exclude<PageColumns, null>): TextRun | undefined {
  if (!cols) return
  const minX = cols[start] - 5
  const maxX = next ? cols[next] - 5 : Infinity
  return line.items.find((item) => item.x >= minX && item.x < maxX)
}

function lineItemStarts(lines: VisualLine[]): number[] {
  const starts: number[] = []
  lines.forEach((line, idx) => {
    const first = line.items[0]?.str
    const lineNumber = line.items[1]?.str
    if (first && PR_RE.test(first) && lineNumber && LINE_RE.test(lineNumber)) starts.push(idx)
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
  poDate: ParsedDateField,
  head: VisualLine,
  block: VisualLine[],
  cols: PageColumns,
  visuals: PageVisuals | undefined,
): TrackerRow {
  const line = Number(head.items[1]?.str)
  const project = blockText(block, 'EIN#:')
  const rev = blockRev(block)
  const description = blockText(block, 'Part Name:')
  const requestedRaw = blockText(block, 'Date Required:')
  const requested = parseDateField(requestedRaw)
  const flags: TrackerRow['flags'] = []
  if (!project) flags.push('project')
  if (!rev) flags.push('rev')
  if (requested.issue) flags.push('requested')
  const quantity = inCol(head, cols, 'quantity', 'uom')
  const unitPrice = inCol(head, cols, 'unitPrice', 'discount')
  const total = inCol(head, cols, 'amount')
  const obscured: ObscuredPriceField[] = []
  const dateIssues: NonNullable<TrackerRow['dateIssues']> = {}
  if (poDate.issue) dateIssues.poDate = { kind: poDate.issue, ...(poDate.raw ? { raw: poDate.raw } : {}) }
  if (requested.issue) dateIssues.requested = { kind: requested.issue, ...(requested.raw ? { raw: requested.raw } : {}) }
  if (isCoveredByLaterImage(unitPrice, visuals)) obscured.push('unitPrice')
  if (isCoveredByLaterImage(total, visuals)) obscured.push('total')
  return {
    job: '',
    drawing: '',
    pur: '',
    poDate: poDate.value,
    poNumber,
    line,
    project,
    rev,
    description,
    qty: parseNumber(quantity?.str),
    unitPrice: obscured.includes('unitPrice') ? null : parseNumber(unitPrice?.str),
    total: obscured.includes('total') ? null : parseNumber(total?.str),
    requested: requested.value,
    flags,
    ...(obscured.length > 0 ? { obscured } : {}),
    ...(Object.keys(dateIssues).length > 0 ? { dateIssues } : {}),
  }
}
