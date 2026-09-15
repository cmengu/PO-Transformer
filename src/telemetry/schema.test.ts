import { describe, expect, it } from 'vitest'
import { telemetryEventSchema } from './schema'

const batchId = '9b5f78e4-d484-4635-9de8-c750d8a0cb7e'
const attemptId = '49521a4d-aa15-4a4f-848e-42ce7b7f780f'

describe('telemetry payload validation', () => {
  it('accepts a minimal non-sensitive batch event', () => {
    expect(
      telemetryEventSchema.safeParse({
        type: 'batch-started',
        batch: {
          id: batchId,
          fileCount: 2,
          appVersion: '0.1.0',
          parserVersion: '1',
          browserFamily: 'Chrome',
          osFamily: 'Windows',
          environment: 'production',
        },
      }).success,
    ).toBe(true)
  })

  it('rejects PO content and contradictory outcome data', () => {
    expect(
      telemetryEventSchema.safeParse({
        type: 'batch-started',
        batch: {
          id: batchId,
          fileCount: 1,
          appVersion: '0.1.0',
          parserVersion: '1',
          browserFamily: null,
          osFamily: null,
          environment: 'production',
          filename: '4500012345-sensitive.pdf',
        },
      }).success,
    ).toBe(false)

    expect(
      telemetryEventSchema.safeParse({
        type: 'attempt-recorded',
        attempt: {
          id: attemptId,
          batchId,
          attemptNumber: 1,
          fileSizeBytes: 100,
          durationMs: 20,
          outcome: 'complete',
          failureCode: 'no_text',
          detectedRowCount: 1,
          initiallyClearRowCount: 1,
          initiallyReviewRowCount: 0,
          initialFlaggedCellCount: 0,
          obscuredFieldCount: 0,
        },
      }).success,
    ).toBe(false)
  })
})
