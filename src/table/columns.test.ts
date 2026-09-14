import { describe, expect, it } from 'vitest'
import type { TrackerRow } from '../domain/types'
import {
  columnFlagged,
  columnValue,
  createCustomColumn,
  defaultColumns,
  moveColumn,
  parseColumnValue,
  removeColumn,
} from './columns'

const row: TrackerRow = {
  job: '', drawing: '', pur: '', poDate: '03/09/2026', poNumber: '4500011111', line: 10,
  project: 'B9001-AA100', rev: '02', description: 'BRACKET', qty: 4, unitPrice: 12.5,
  total: 50, requested: '20/12/2026', flags: [], customValues: { customer: 'Acme' },
}

describe('column definitions', () => {
  it('provides the tracker defaults in the existing order', () => {
    expect(defaultColumns().map((column) => column.label)).toEqual([
      'Job#', 'Engineering drawing#', 'PO Date', 'PO #', 'Line', 'Pur', 'Project Number',
      'Rev', 'Description', 'PO Qty', 'Requested Date', 'Unit Price', 'Total Price',
    ])
  })

  it('moves and removes columns without mutating the input', () => {
    const columns = defaultColumns()
    const moved = moveColumn(columns, 'total', 'job')
    expect(moved[0].id).toBe('total')
    expect(columns[0].id).toBe('job')
    expect(removeColumn(moved, 'total').some((column) => column.id === 'total')).toBe(false)
  })

  it('reads custom values and parses typed custom input', () => {
    const custom = createCustomColumn('customer', 'Customer', 'text')
    const number = createCustomColumn('batch', 'Batch', 'number')
    expect(columnValue(row, custom)).toBe('Acme')
    expect(parseColumnValue(number, '1,250')).toBe(1250)
    expect(parseColumnValue(number, 'not a number')).toBeNull()
  })

  it('uses source warning metadata only for source-backed columns', () => {
    const invalid = { ...row, poDate: '31/02/2026', dateIssues: { poDate: { kind: 'invalid' as const, raw: '31/02/2026' } } }
    expect(columnFlagged(invalid, defaultColumns().find((column) => column.id === 'poDate')!)).toBe(true)
    expect(columnFlagged(row, createCustomColumn('customer', 'Customer'))).toBe(false)
  })
})
