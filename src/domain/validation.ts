import type { DateField, ObscuredPriceField, TrackerRow } from './types'

export const REQUIRED_CELL_FIELDS = [
  'poDate',
  'poNumber',
  'line',
  'pur',
  'project',
  'rev',
  'description',
  'qty',
  'requested',
  'unitPrice',
  'total',
] as const satisfies readonly (keyof TrackerRow)[]

export type RequiredCellField = (typeof REQUIRED_CELL_FIELDS)[number]

export function isMissingRequiredValue(row: TrackerRow, field: RequiredCellField): boolean {
  const value = row[field]
  if (typeof value === 'string') return value.trim() === ''
  if (typeof value === 'number') return !Number.isFinite(value) || (field === 'line' && value <= 0)
  return value == null
}

export function cellNeedsAttention(row: TrackerRow, field: RequiredCellField): boolean {
  if ((field === 'poDate' || field === 'requested') && row.dateIssues?.[field as DateField]) {
    return true
  }
  if ((field === 'unitPrice' || field === 'total') && row.obscured?.includes(field as ObscuredPriceField)) {
    return true
  }
  return isMissingRequiredValue(row, field)
}
