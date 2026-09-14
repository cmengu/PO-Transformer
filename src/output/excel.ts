import writeXlsxFile, { type Row, type SheetData } from 'write-excel-file/universal'
import type { ExcelFile, TrackerRow } from '../domain/types'

const RED = '#C00000'
const YELLOW = '#FFD966'
const CYAN = '#7FF5EA'
const GREY = '#D9D9D9'
const BLACK = '#000000'
const PINK = '#FFC7CE'

const COLUMNS: Array<{
  value: string
  textColor: string
  backgroundColor: string
}> = [
  { value: 'Job#', textColor: RED, backgroundColor: YELLOW },
  { value: 'Engineering drawing#', textColor: RED, backgroundColor: YELLOW },
  { value: 'PO Date', textColor: BLACK, backgroundColor: YELLOW },
  { value: 'PO #', textColor: BLACK, backgroundColor: YELLOW },
  { value: 'Line', textColor: BLACK, backgroundColor: YELLOW },
  { value: 'Pur', textColor: RED, backgroundColor: YELLOW },
  { value: 'Project Number', textColor: RED, backgroundColor: YELLOW },
  { value: 'Rev', textColor: RED, backgroundColor: YELLOW },
  { value: 'Description', textColor: BLACK, backgroundColor: YELLOW },
  { value: 'PO Qty', textColor: BLACK, backgroundColor: CYAN },
  { value: 'Requested Date', textColor: RED, backgroundColor: YELLOW },
  { value: 'Unit Price', textColor: BLACK, backgroundColor: GREY },
  { value: 'Total Price', textColor: BLACK, backgroundColor: GREY },
]

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

function parseUkDate(value: string): Date | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return undefined
  const [, day, month, year] = match
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
}

function fill(row: TrackerRow, flag: 'project' | 'rev' | 'requested') {
  return row.flags.includes(flag) ? PINK : undefined
}

function textCell(value: string, backgroundColor?: string) {
  return { type: String, value, backgroundColor }
}

function numberCell(value: number | null) {
  return value === null ? null : { type: Number, value }
}

function dateCell(value: string, backgroundColor?: string) {
  const date = parseUkDate(value)
  if (!date) return backgroundColor ? { backgroundColor } : null
  return { type: Date, value: date, format: 'dd/mm/yyyy', backgroundColor }
}

function dataRow(row: TrackerRow): Row {
  return [
    textCell(row.job),
    textCell(row.drawing),
    dateCell(row.poDate),
    textCell(row.poNumber),
    numberCell(row.line),
    textCell(row.pur),
    textCell(row.project, fill(row, 'project')),
    textCell(row.rev, fill(row, 'rev')),
    textCell(row.description),
    numberCell(row.qty),
    dateCell(row.requested, fill(row, 'requested')),
    numberCell(row.unitPrice),
    numberCell(row.total),
  ]
}

export function excelSheet(rows: TrackerRow[]): {
  data: SheetData
  columns: Array<{ width: number }>
  fileName: string
} {
  const header = COLUMNS.map((column) => ({
    value: column.value,
    fontWeight: 'bold' as const,
    align: 'center' as const,
    textColor: column.textColor,
    backgroundColor: column.backgroundColor,
  }))
  return {
    data: [header, ...rows.map(dataRow)],
    columns: COLUMNS.map(() => ({ width: 16 })),
    fileName: fileNameFor(rows),
  }
}

export async function excelFile(rows: TrackerRow[]): Promise<ExcelFile> {
  const { data, columns, fileName } = excelSheet(rows)
  const blob = await writeXlsxFile(data, { columns }).toBlob()
  return { blob, fileName }
}
