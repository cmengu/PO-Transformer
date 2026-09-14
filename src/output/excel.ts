import writeXlsxFile, { type Row, type SheetData } from 'write-excel-file/universal'
import { parseUkDate } from '../domain/dates'
import type { ExcelFile, TrackerRow } from '../domain/types'
import { columnFlagged, columnValue, DEFAULT_COLUMNS, type ColumnDefinition } from '../table/columns'

const PINK = '#FFC7CE'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function todayStamp(now: Date): string {
  return `${pad2(now.getDate())}-${pad2(now.getMonth() + 1)}-${now.getFullYear()}`
}

function fileNameFor(rows: TrackerRow[]): string {
  const poNumbers = new Set(rows.map((row) => row.poNumber))
  const onlyPo = poNumbers.size === 1 ? rows[0]?.poNumber : undefined
  return onlyPo ? `PO-${onlyPo}.xlsx` : `PO-rows-${todayStamp(new Date())}.xlsx`
}

function textCell(value: string, backgroundColor?: string) {
  return { type: String, value, backgroundColor }
}

function numberCell(value: number | null, backgroundColor?: string) {
  if (value === null) return backgroundColor ? { backgroundColor } : null
  return { type: Number, value, backgroundColor }
}

function dateCell(value: string, backgroundColor?: string) {
  const date = parseUkDate(value)
  if (date) return { type: Date, value: date, format: 'dd/mm/yyyy', backgroundColor }
  if (value) return textCell(value, backgroundColor)
  return backgroundColor ? { backgroundColor } : null
}

function numericValue(value: string): number | null {
  if (!value) return null
  const number = Number(value.replace(/,/g, ''))
  return Number.isFinite(number) ? number : null
}

function cellFor(row: TrackerRow, column: ColumnDefinition) {
  const value = columnValue(row, column)
  const backgroundColor = columnFlagged(row, column) ? PINK : undefined
  if (column.type === 'date') return dateCell(value, backgroundColor)
  if (column.type === 'number') return numberCell(numericValue(value), backgroundColor)
  return textCell(value, backgroundColor)
}

function dataRow(row: TrackerRow, columns: ColumnDefinition[]): Row {
  return columns.map((column) => cellFor(row, column))
}

export function excelSheet(rows: TrackerRow[], columns: ColumnDefinition[] = DEFAULT_COLUMNS): {
  data: SheetData
  columns: Array<{ width: number }>
  fileName: string
} {
  const header = columns.map((column) => ({
    value: column.label,
    fontWeight: 'bold' as const,
    align: 'center' as const,
    textColor: column.headerFg,
    backgroundColor: column.headerBg,
  }))
  return {
    data: [header, ...rows.map((row) => dataRow(row, columns))],
    columns: columns.map(() => ({ width: 16 })),
    fileName: fileNameFor(rows),
  }
}

export async function excelFile(rows: TrackerRow[], columns: ColumnDefinition[] = DEFAULT_COLUMNS): Promise<ExcelFile> {
  const { data, columns: widths, fileName } = excelSheet(rows, columns)
  const blob = await writeXlsxFile(data, { columns: widths }).toBlob()
  return { blob, fileName }
}
