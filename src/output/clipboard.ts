import type { ClipboardPayload, DateField, ObscuredPriceField, TrackerRow } from '../domain/types'

const HEADERS = [
  'Job#',
  'Engineering drawing#',
  'PO Date',
  'PO #',
  'Line',
  'Pur',
  'Project Number',
  'Rev',
  'Description',
  'PO Qty',
  'Requested Date',
  'Unit Price',
  'Total Price',
]

function formatNumber(value: number | null): string {
  return value === null ? '' : String(value)
}

function rowCells(row: TrackerRow): string[] {
  return [
    row.job,
    row.drawing,
    row.poDate,
    row.poNumber,
    String(row.line),
    row.pur,
    row.project,
    row.rev,
    row.description,
    formatNumber(row.qty),
    row.requested,
    formatNumber(row.unitPrice),
    formatNumber(row.total),
  ]
}

const RED = '#C00000'
const YELLOW = '#FFD966'
const CYAN = '#7FF5EA'
const GREY = '#D9D9D9'
const BLACK = '#000000'

const HEADER_COLOURS: Array<{ background: string; color: string }> = [
  { background: YELLOW, color: RED },
  { background: YELLOW, color: RED },
  { background: YELLOW, color: BLACK },
  { background: YELLOW, color: BLACK },
  { background: YELLOW, color: BLACK },
  { background: YELLOW, color: RED },
  { background: YELLOW, color: RED },
  { background: YELLOW, color: RED },
  { background: YELLOW, color: BLACK },
  { background: CYAN, color: BLACK },
  { background: YELLOW, color: RED },
  { background: GREY, color: BLACK },
  { background: GREY, color: BLACK },
]

const TEXT_CELL_INDEXES = new Set([2, 3, 6, 7, 10])
const PINK = '#FFC7CE'
const WHITE = '#FFFFFF'
const FLAG_INDEX: Record<'project' | 'rev' | DateField | ObscuredPriceField, number> = {
  project: 6,
  rev: 7,
  poDate: 2,
  requested: 10,
  unitPrice: 11,
  total: 12,
}
const CELL_BASE =
  'border: 1px solid #000000; padding: 4px; font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 14pt;'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function htmlTable(rows: TrackerRow[]): string {
  const header = HEADERS.map((label, index) => {
    const { background, color } = HEADER_COLOURS[index]
    return `<th style="${CELL_BASE} background-color: ${background}; color: ${color};">${label}</th>`
  }).join('')
  const body = rows
    .map((row) => {
      const flagged = new Set([
        ...row.flags.map((flag) => FLAG_INDEX[flag]),
        ...(row.obscured ?? []).map((field) => FLAG_INDEX[field]),
        ...Object.keys(row.dateIssues ?? {}).map((field) => FLAG_INDEX[field as DateField]),
      ])
      const tds = rowCells(row)
        .map((value, index) => {
          const textFormat = TEXT_CELL_INDEXES.has(index) ? " mso-number-format:'\\@';" : ''
          const fill = flagged.has(index) ? PINK : WHITE
          return `<td style="${CELL_BASE} background-color: ${fill};${textFormat}">${escapeHtml(value)}</td>`
        })
        .join('')
      return `<tr>${tds}</tr>`
    })
    .join('')
  return `<table><tr>${header}</tr>${body}</table>`
}

export function clipboardPayload(rows: TrackerRow[]): ClipboardPayload {
  const plain = [HEADERS.join('\t'), ...rows.map((row) => rowCells(row).join('\t'))].join('\n')
  return { html: htmlTable(rows), plain }
}
