import { describe, expect, it } from 'vitest'
import type { TrackerRow } from '@/domain/types'
import { flagNote, isFlagged } from './data'

const row: TrackerRow = {
  job: '',
  drawing: '',
  pur: '',
  poDate: '31/02/2026',
  poNumber: '4500011111',
  line: 10,
  project: 'B9001-AA100',
  rev: '02',
  description: 'MOUNTING BRACKET',
  qty: 4,
  unitPrice: 12.5,
  total: 50,
  requested: '',
  flags: ['requested'],
  dateIssues: {
    poDate: { kind: 'invalid', raw: '31/02/2026' },
    requested: { kind: 'missing' },
  },
}

describe('demo cell warnings', () => {
  it('flags invalid PO dates as well as missing requested dates', () => {
    expect(isFlagged(row, 'poDate')).toBe(true)
    expect(isFlagged(row, 'requested')).toBe(true)
  })

  it('explains whether a date is invalid or unavailable', () => {
    expect(flagNote(row, 'poDate')).toBe('Invalid date: 31/02/2026 — enter DD/MM/YYYY')
    expect(flagNote(row, 'requested')).toBe('Date unavailable — please check PO')
  })
})
