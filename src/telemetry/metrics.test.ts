import { describe, expect, it } from 'vitest'
import type { ReadResult, TrackerRow } from '@/domain/types'
import {
  browserFamily,
  createReadAttempt,
  osFamily,
  recordCorrection,
  summarizeRows,
} from './metrics'

function row(overrides: Partial<TrackerRow> = {}): TrackerRow {
  return {
    job: '',
    drawing: '',
    pur: '',
    poDate: '15/09/2026',
    poNumber: '4500012345',
    line: 10,
    project: 'P-100',
    rev: '01',
    description: 'Bracket',
    qty: 2,
    unitPrice: 10,
    total: 20,
    requested: '20/09/2026',
    flags: [],
    ...overrides,
  }
}

describe('telemetry metrics', () => {
  it('separates clear and review rows without retaining row contents', () => {
    const metrics = summarizeRows([
      row(),
      row({ line: 20, flags: ['project'], obscured: ['total'] }),
    ])

    expect(metrics).toEqual({
      detectedRowCount: 2,
      clearRowCount: 1,
      reviewRowCount: 1,
      flaggedCellCount: 2,
      obscuredFieldCount: 1,
    })
  })

  it('classifies a clean read, a partial read, and a failure', () => {
    const clean: ReadResult = { file: 'local-only.pdf', kind: 'rows', rows: [row()] }
    const partial: ReadResult = { file: 'local-only.pdf', kind: 'rows', rows: [row({ flags: ['rev'] })] }
    const failed: ReadResult = { file: 'local-only.pdf', kind: 'issue', issue: 'no-text' }

    expect(createReadAttempt(crypto.randomUUID(), 'file-a', 1, 100, 20, clean).outcome).toBe('complete')
    expect(createReadAttempt(crypto.randomUUID(), 'file-b', 1, 100, 20, partial).outcome).toBe('partial')
    expect(createReadAttempt(crypto.randomUUID(), 'file-c', 1, 100, 20, failed)).toMatchObject({
      outcome: 'failed',
      failureCode: 'no_text',
    })
  })

  it('counts a corrected cell once while retaining every edit operation', () => {
    const attempt = createReadAttempt(
      crypto.randomUUID(),
      'file-a',
      1,
      100,
      20,
      { file: 'local-only.pdf', kind: 'rows', rows: [row()] },
    )
    const trackedRow = row()

    recordCorrection([attempt], trackedRow, 'project')
    recordCorrection([attempt], trackedRow, 'project')
    recordCorrection([attempt], trackedRow, 'rev')

    expect(attempt.editOperationCount).toBe(3)
    expect(attempt.uniqueEditedCells.size).toBe(2)
    expect(attempt.correctionsByField).toEqual({ project: 1, rev: 1 })
  })

  it('keeps client context coarse', () => {
    expect(browserFamily('Mozilla/5.0 Edg/124.0')).toBe('Edge')
    expect(browserFamily('Mozilla/5.0 Firefox/123.0')).toBe('Firefox')
    expect(osFamily('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Windows')
    expect(osFamily('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBe('macOS')
  })
})
