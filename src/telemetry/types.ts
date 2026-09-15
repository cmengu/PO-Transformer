import type { TrackerRow } from '@/domain/types'

export const CORRECTION_FIELDS = [
  'pur',
  'poDate',
  'poNumber',
  'line',
  'project',
  'rev',
  'description',
  'qty',
  'unitPrice',
  'total',
  'requested',
] as const

export type CorrectionField = (typeof CORRECTION_FIELDS)[number]

export type FailureCode =
  | 'invalid_file_type'
  | 'unreadable_file'
  | 'no_text'
  | 'unsupported_format'
  | 'parser_exception'

export type AttemptOutcome = 'complete' | 'partial' | 'failed'

export type Environment = 'development' | 'production'

export type BatchStartedEvent = {
  type: 'batch-started'
  batch: {
    id: string
    fileCount: number
    appVersion: string
    parserVersion: string
    browserFamily: string | null
    osFamily: string | null
    environment: Environment
  }
}

export type AttemptRecordedEvent = {
  type: 'attempt-recorded'
  attempt: {
    id: string
    batchId: string
    attemptNumber: number
    fileSizeBytes: number
    durationMs: number
    outcome: AttemptOutcome
    failureCode: FailureCode | null
    detectedRowCount: number
    initiallyClearRowCount: number
    initiallyReviewRowCount: number
    initialFlaggedCellCount: number
    obscuredFieldCount: number
  }
}

export type AttemptFinalization = {
  id: string
  finalReviewRowCount: number
  finalFlaggedCellCount: number
  uniqueEditedCellCount: number
  editOperationCount: number
  correctionsByField: Partial<Record<CorrectionField, number>>
}

export type BatchFinalizedEvent = {
  type: 'batch-finalized'
  batch: {
    id: string
    completeFileCount: number
    partialFileCount: number
    failedFileCount: number
    detectedRowCount: number
    reviewRowCount: number
    durationMs: number
    retryCount: number
    copyCount: number
    downloadCount: number
    abandoned: boolean
  }
  attempts: AttemptFinalization[]
}

export type TelemetryEvent = BatchStartedEvent | AttemptRecordedEvent | BatchFinalizedEvent

export type RowMetrics = {
  detectedRowCount: number
  clearRowCount: number
  reviewRowCount: number
  flaggedCellCount: number
  obscuredFieldCount: number
}

export type LocalAttempt = {
  id: string
  itemId: string
  attemptNumber: number
  fileSizeBytes: number
  durationMs: number
  outcome: AttemptOutcome
  failureCode: FailureCode | null
  rowKeys: string[]
  initial: RowMetrics
  uniqueEditedCells: Set<string>
  editOperationCount: number
  correctionsByField: Partial<Record<CorrectionField, number>>
}

export type LocalBatch = {
  id: string
  startedAt: number
  fileCount: number
  retryCount: number
  copyCount: number
  downloadCount: number
  attempts: LocalAttempt[]
}

export type RowIdentity = Pick<TrackerRow, 'poNumber' | 'line'>
