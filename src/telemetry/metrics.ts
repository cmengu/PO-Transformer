import type { ReadResult, TrackerRow } from '@/domain/types'
import {
  CORRECTION_FIELDS,
  type AttemptOutcome,
  type CorrectionField,
  type FailureCode,
  type LocalAttempt,
  type RowIdentity,
  type RowMetrics,
} from './types'

export function isCorrectionField(value: string): value is CorrectionField {
  return (CORRECTION_FIELDS as readonly string[]).includes(value)
}

export function rowKey(row: RowIdentity): string {
  return `${row.poNumber}\u0000${row.line}`
}

export function flaggedCellCount(row: TrackerRow): number {
  return row.flags.length + (row.obscured?.length ?? 0) + (row.dateIssues?.poDate ? 1 : 0)
}

export function summarizeRows(rows: TrackerRow[]): RowMetrics {
  let clearRowCount = 0
  let reviewRowCount = 0
  let flaggedCellCountTotal = 0
  let obscuredFieldCount = 0

  for (const row of rows) {
    const flags = flaggedCellCount(row)
    flaggedCellCountTotal += flags
    obscuredFieldCount += row.obscured?.length ?? 0
    if (flags === 0) clearRowCount += 1
    else reviewRowCount += 1
  }

  return {
    detectedRowCount: rows.length,
    clearRowCount,
    reviewRowCount,
    flaggedCellCount: flaggedCellCountTotal,
    obscuredFieldCount,
  }
}

export function failureCodeFor(result: ReadResult | null): FailureCode {
  if (!result) return 'parser_exception'
  if (result.kind === 'issue') {
    if (result.issue === 'not-pdf') return 'invalid_file_type'
    if (result.issue === 'no-text') return 'no_text'
    return 'unsupported_format'
  }
  return 'parser_exception'
}

export function outcomeFor(metrics: RowMetrics): AttemptOutcome {
  return metrics.reviewRowCount === 0 ? 'complete' : 'partial'
}

export function createReadAttempt(
  id: string,
  itemId: string,
  attemptNumber: number,
  fileSizeBytes: number,
  durationMs: number,
  result: ReadResult | null,
): LocalAttempt {
  const initial = result?.kind === 'rows' ? summarizeRows(result.rows) : summarizeRows([])
  const failureCode = result?.kind === 'rows' ? null : failureCodeFor(result)

  return {
    id,
    itemId,
    attemptNumber,
    fileSizeBytes,
    durationMs,
    outcome: failureCode ? 'failed' : outcomeFor(initial),
    failureCode,
    rowKeys: result?.kind === 'rows' ? result.rows.map(rowKey) : [],
    initial,
    uniqueEditedCells: new Set(),
    editOperationCount: 0,
    correctionsByField: {},
  }
}

export function recordCorrection(
  attempts: LocalAttempt[],
  row: RowIdentity,
  field: CorrectionField,
): void {
  const key = rowKey(row)
  const attempt = attempts.find((candidate) => candidate.rowKeys.includes(key))
  if (!attempt) return

  attempt.editOperationCount += 1
  const cellKey = `${key}\u0000${field}`
  if (attempt.uniqueEditedCells.has(cellKey)) return

  attempt.uniqueEditedCells.add(cellKey)
  attempt.correctionsByField[field] = (attempt.correctionsByField[field] ?? 0) + 1
}

export function browserFamily(userAgent: string): string | null {
  if (/edg\//i.test(userAgent)) return 'Edge'
  if (/opr\//i.test(userAgent)) return 'Opera'
  if (/firefox\//i.test(userAgent)) return 'Firefox'
  if (/chrome\//i.test(userAgent)) return 'Chrome'
  if (/safari\//i.test(userAgent)) return 'Safari'
  return null
}

export function osFamily(userAgent: string): string | null {
  if (/windows/i.test(userAgent)) return 'Windows'
  if (/android/i.test(userAgent)) return 'Android'
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS'
  if (/mac os/i.test(userAgent)) return 'macOS'
  if (/linux/i.test(userAgent)) return 'Linux'
  return null
}
