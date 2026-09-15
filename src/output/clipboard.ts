import type { ClipboardPayload, TrackerRow } from '../domain/types'
import { columnFlagged, columnValue, DEFAULT_COLUMNS, type ColumnDefinition } from '../table/columns'

const PINK = '#FFC7CE'
const WHITE = '#FFFFFF'
const CELL_BASE =
  'border: 1px solid #000000; padding: 4px; font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 14pt;'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function textFormat(column: ColumnDefinition): string {
  if (column.type === 'date') return " mso-number-format:'\\@';"
  if (column.source === 'poNumber' || column.source === 'project' || column.source === 'rev') {
    return " mso-number-format:'\\@';"
  }
  return ''
}

export type ClipboardOptions = {
  includeHeaders?: boolean
}

function htmlTable(
  rows: TrackerRow[],
  columns: ColumnDefinition[],
  includeHeaders: boolean,
): string {
  const header = columns.map((column) =>
    `<th style="${CELL_BASE} background-color: ${column.headerBg}; color: ${column.headerFg};">${escapeHtml(column.label)}</th>`,
  ).join('')
  const body = rows.map((row) => {
    const tds = columns.map((column) => {
      const value = columnValue(row, column)
      const fill = columnFlagged(row, column) ? PINK : WHITE
      return `<td style="${CELL_BASE} background-color: ${fill};${textFormat(column)}">${escapeHtml(value)}</td>`
    }).join('')
    return `<tr>${tds}</tr>`
  }).join('')
  return `<table>${includeHeaders ? `<tr>${header}</tr>` : ''}${body}</table>`
}

export function clipboardPayload(
  rows: TrackerRow[],
  columns: ColumnDefinition[] = DEFAULT_COLUMNS,
  { includeHeaders = true }: ClipboardOptions = {},
): ClipboardPayload {
  const header = columns.map((column) => column.label).join('\t')
  const values = rows.map((row) => columns.map((column) => columnValue(row, column)).join('\t'))
  const plain = (includeHeaders ? [header, ...values] : values).join('\n')
  return { html: htmlTable(rows, columns, includeHeaders), plain }
}
