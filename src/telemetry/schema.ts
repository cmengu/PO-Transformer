import { z } from 'zod'
import { CORRECTION_FIELDS } from './types'

const id = z.string().uuid()
const nonNegativeInteger = z.number().int().min(0)
const environment = z.enum(['development', 'production'])
const failureCode = z.enum([
  'invalid_file_type',
  'unreadable_file',
  'no_text',
  'unsupported_format',
  'parser_exception',
])
const correctionCounts = z
  .object(
    Object.fromEntries(CORRECTION_FIELDS.map((field) => [field, nonNegativeInteger])) as Record<
      (typeof CORRECTION_FIELDS)[number],
      typeof nonNegativeInteger
    >,
  )
  .partial()
  .strict()

const batchStarted = z
  .object({
    type: z.literal('batch-started'),
    batch: z
      .object({
        id,
        fileCount: nonNegativeInteger,
        appVersion: z.string().min(1).max(64),
        parserVersion: z.string().min(1).max(64),
        browserFamily: z.string().max(32).nullable(),
        osFamily: z.string().max(32).nullable(),
        environment,
      })
      .strict(),
  })
  .strict()

const attemptCommon = z.object({
  id,
  batchId: id,
  attemptNumber: z.number().int().positive(),
  fileSizeBytes: nonNegativeInteger,
  durationMs: nonNegativeInteger,
  detectedRowCount: nonNegativeInteger,
  initiallyClearRowCount: nonNegativeInteger,
  initiallyReviewRowCount: nonNegativeInteger,
  initialFlaggedCellCount: nonNegativeInteger,
  obscuredFieldCount: nonNegativeInteger,
})

const attemptRecorded = z
  .object({
    type: z.literal('attempt-recorded'),
    attempt: z.discriminatedUnion('outcome', [
      attemptCommon.extend({
        outcome: z.literal('failed'),
        failureCode,
      }),
      attemptCommon.extend({
        outcome: z.enum(['complete', 'partial']),
        failureCode: z.null(),
      }),
    ]),
  })
  .strict()

const batchFinalized = z
  .object({
    type: z.literal('batch-finalized'),
    batch: z
      .object({
        id,
        completeFileCount: nonNegativeInteger,
        partialFileCount: nonNegativeInteger,
        failedFileCount: nonNegativeInteger,
        detectedRowCount: nonNegativeInteger,
        reviewRowCount: nonNegativeInteger,
        durationMs: nonNegativeInteger,
        retryCount: nonNegativeInteger,
        copyCount: nonNegativeInteger,
        downloadCount: nonNegativeInteger,
        abandoned: z.boolean(),
      })
      .strict(),
    attempts: z
      .array(
        z
          .object({
            id,
            finalReviewRowCount: nonNegativeInteger,
            finalFlaggedCellCount: nonNegativeInteger,
            uniqueEditedCellCount: nonNegativeInteger,
            editOperationCount: nonNegativeInteger,
            correctionsByField: correctionCounts,
          })
          .strict(),
      )
      .max(250),
  })
  .strict()

export const telemetryEventSchema = z.discriminatedUnion('type', [
  batchStarted,
  attemptRecorded,
  batchFinalized,
])

export type ValidTelemetryEvent = z.infer<typeof telemetryEventSchema>
