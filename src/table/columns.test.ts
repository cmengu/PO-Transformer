import { describe, expect, it } from 'vitest'
import type { TrackerRow } from '../domain/types'
import {
  columnFlagged,
  columnLabelError,
  columnValue,
  createCustomColumn,
  defaultColumnLayout,
  defaultColumns,
  deleteCustomColumn,
  hideBuiltInColumn,
  moveColumn,
  moveColumnAround,
  moveColumnToIndex,
  parseColumnValue,
  removeColumn,
  restoreBuiltInColumn,
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

  it('previews a direct table-header drop before or after its target', () => {
    const columns = defaultColumns().slice(0, 4)
    expect(moveColumnAround(columns, 'poNumber', 'drawing', 'before').map((column) => column.id)).toEqual([
      'job', 'poNumber', 'drawing', 'poDate',
    ])
    expect(moveColumnAround(columns, 'job', 'poDate', 'after').map((column) => column.id)).toEqual([
      'drawing', 'poDate', 'job', 'poNumber',
    ])
    expect(moveColumnToIndex(columns, 'job', 99).at(-1)?.id).toBe('job')
  })

  it('hides and restores a built-in column while keeping custom columns visible', () => {
    const layout = {
      ...defaultColumnLayout(),
      columns: [...defaultColumns(), createCustomColumn('customer', 'Customer')],
    }
    const hidden = hideBuiltInColumn(layout, 'poNumber')
    expect(hidden.columns.some((column) => column.id === 'poNumber')).toBe(false)
    expect(hidden.hiddenBuiltInColumns.map((column) => column.id)).toEqual(['poNumber'])
    expect(hidden.columns.some((column) => column.id === 'customer')).toBe(true)

    const restored = restoreBuiltInColumn(hidden, 'poNumber')
    expect(restored.columns.some((column) => column.id === 'poNumber')).toBe(true)
    expect(restored.hiddenBuiltInColumns).toEqual([])
  })

  it('only permanently deletes custom columns and validates names', () => {
    const columns = [...defaultColumns(), createCustomColumn('customer', 'Customer')]
    expect(deleteCustomColumn(columns, 'poNumber')).toBe(columns)
    expect(deleteCustomColumn(columns, 'customer').some((column) => column.id === 'customer')).toBe(false)
    expect(columnLabelError(columns, '  ')).toBe('Enter a column name')
    expect(columnLabelError(columns, 'customer')).toBe('A column with this name already exists')
    expect(columnLabelError(columns, 'Customer', 'customer')).toBeNull()
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
