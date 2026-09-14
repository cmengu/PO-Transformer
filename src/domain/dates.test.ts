import { describe, expect, it } from 'vitest'
import { parseUkDate, toTrackerDate, requestedDate } from './dates'

describe('toTrackerDate', () => {
  it('turns DD-MMM-YYYY into dd/mm/yyyy', () => {
    expect(toTrackerDate('16-NOV-2026')).toBe('16/11/2026')
    expect(toTrackerDate('05-JAN-2027')).toBe('05/01/2027')
  })

  it('pads a typed d/m/yyyy date', () => {
    expect(toTrackerDate('5/1/2026')).toBe('05/01/2026')
  })

  it('keeps an already padded dd/mm/yyyy date', () => {
    expect(toTrackerDate('03/09/2026')).toBe('03/09/2026')
  })

  it('returns empty for a missing or unparseable value', () => {
    expect(toTrackerDate(undefined)).toBe('')
    expect(toTrackerDate('')).toBe('')
    expect(toTrackerDate('ASAP')).toBe('')
  })

  it('rejects impossible calendar dates instead of normalising them', () => {
    expect(toTrackerDate('31/02/2026')).toBe('')
    expect(toTrackerDate('31-FEB-2026')).toBe('')
    expect(toTrackerDate('29-FEB-2026')).toBe('')
    expect(toTrackerDate('29-FEB-2028')).toBe('29/02/2028')
  })
})

describe('parseUkDate', () => {
  it('parses padded and unpadded UK dates to the same UTC day', () => {
    expect(parseUkDate('5/1/2026')?.toISOString()).toBe(parseUkDate('05/01/2026')?.toISOString())
    expect(parseUkDate('05/01/2026')?.toISOString()).toBe('2026-01-05T00:00:00.000Z')
  })

  it('does not roll invalid dates into a later month', () => {
    expect(parseUkDate('31/02/2026')).toBeUndefined()
  })
})

describe('requestedDate', () => {
  it('flags a missing date', () => {
    expect(requestedDate('')).toEqual({ value: '', flag: true })
  })

  it('keeps an unparseable date and flags it', () => {
    expect(requestedDate('ASAP')).toEqual({ value: 'ASAP', flag: true })
  })

  it('normalises a PO date and does not flag it', () => {
    expect(requestedDate('16-NOV-2026')).toEqual({ value: '16/11/2026', flag: false })
  })
})
