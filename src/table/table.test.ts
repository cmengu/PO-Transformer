import { describe, expect, it } from 'vitest'
import type { ReadResult, TrackerRow } from '../domain/types'
import { addResults, createTable, editCell, flaggedCellCount, resetTable, sheetStatus } from './table'

function row(overrides: Partial<TrackerRow> & Pick<TrackerRow, 'poNumber' | 'line'>): TrackerRow {
  return {
    job: '',
    drawing: '',
    pur: '',
    poDate: '03/09/2026',
    project: 'B9001-AA100',
    rev: '02',
    description: 'MOUNTING BRACKET',
    qty: 4,
    unitPrice: 12.5,
    total: 50,
    requested: '20/12/2026',
    flags: [],
    ...overrides,
  }
}

function rowsResult(file: string, rows: TrackerRow[]): ReadResult {
  return { file, kind: 'rows', rows }
}

describe('tracker table', () => {
  it('keeps POs in drop order and sorts lines within each PO', () => {
    const table = addResults(createTable(), [
      rowsResult('second.pdf', [row({ poNumber: '4500022222', line: 20 }), row({ poNumber: '4500022222', line: 10 })]),
      rowsResult('first.pdf', [row({ poNumber: '4500011111', line: 10 })]),
    ])

    expect(table.rows.map((r) => [r.poNumber, r.line])).toEqual([
      ['4500022222', 10],
      ['4500022222', 20],
      ['4500011111', 10],
    ])
  })

  it('skips a duplicate poNumber with the file message Already in the table', () => {
    const first = addResults(createTable(), [
      rowsResult('a.pdf', [row({ poNumber: '4500011111', line: 10 })]),
    ])
    const table = addResults(first, [
      rowsResult('b.pdf', [row({ poNumber: '4500011111', line: 20, description: 'COVER PLATE' })]),
    ])

    expect(table.rows).toHaveLength(1)
    expect(table.rows[0].line).toBe(10)
    expect(table.messages).toEqual([{ file: 'b.pdf', message: 'Already in the table' }])
  })

  it('counts flagged cells across rows', () => {
    const table = addResults(createTable(), [
      rowsResult('a.pdf', [
        row({ poNumber: '4500011111', line: 10, project: '', requested: '', flags: ['project', 'requested'] }),
        row({ poNumber: '4500011111', line: 20, rev: '', flags: ['rev'] }),
      ]),
    ])

    expect(flaggedCellCount(table)).toBe(3)
  })

  it('updates an edited cell and clears that field flag when the value is non-empty', () => {
    const started = addResults(createTable(), [
      rowsResult('a.pdf', [
        row({ poNumber: '4500011111', line: 10, requested: '', flags: ['requested'] }),
      ]),
    ])

    const table = editCell(started, 0, 'requested', '01/11/2026')

    expect(table.rows[0].requested).toBe('01/11/2026')
    expect(table.rows[0].flags).toEqual([])
    expect(flaggedCellCount(table)).toBe(0)
  })

  it('does not clear a flag when the edited value is empty', () => {
    const started = addResults(createTable(), [
      rowsResult('a.pdf', [
        row({ poNumber: '4500011111', line: 10, requested: '', flags: ['requested'] }),
      ]),
    ])

    const table = editCell(started, 0, 'requested', '')

    expect(table.rows[0].requested).toBe('')
    expect(table.rows[0].flags).toEqual(['requested'])
  })

  it('adds more results onto an existing table and reset clears it', () => {
    const first = addResults(createTable(), [
      rowsResult('a.pdf', [row({ poNumber: '4500011111', line: 10 })]),
    ])
    const added = addResults(first, [
      rowsResult('b.pdf', [row({ poNumber: '4500022222', line: 10 })]),
    ])

    expect(added.rows.map((r) => r.poNumber)).toEqual(['4500011111', '4500022222'])
    expect(resetTable()).toEqual(createTable())
  })

  it('records file issues as messages and still keeps rows from good files', () => {
    const table = addResults(createTable(), [
      rowsResult('good.pdf', [row({ poNumber: '4500011111', line: 10 })]),
      { file: 'scan.pdf', kind: 'issue', issue: 'no-text' },
      { file: 'notes.pdf', kind: 'issue', issue: 'not-aem' },
      { file: 'letter.txt', kind: 'issue', issue: 'not-pdf' },
    ])

    expect(table.rows).toHaveLength(1)
    expect(table.messages).toEqual([
      { file: 'scan.pdf', message: "Can't be read — looks scanned" },
      { file: 'notes.pdf', message: 'Not an AEM purchase order' },
      { file: 'letter.txt', message: 'Not a PDF' },
    ])
  })

  it('does not show a tracker sheet when the only result is a file issue', () => {
    const table = addResults(createTable(), [
      { file: 'Sep-2026-Europe-Trip-v8.7.pdf', kind: 'issue', issue: 'not-aem' },
    ])

    expect(sheetStatus(table)).toEqual({ showSheet: false, label: null })
  })

  it('shows All cells look complete only when there are unflagged rows', () => {
    const table = addResults(createTable(), [
      rowsResult('a.pdf', [row({ poNumber: '4500011111', line: 10 })]),
    ])

    expect(sheetStatus(table)).toEqual({
      showSheet: true,
      label: 'All cells look complete',
    })
  })
})
