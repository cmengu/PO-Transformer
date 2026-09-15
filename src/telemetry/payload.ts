import type { TelemetryEvent } from './types'

export function databasePayload(event: TelemetryEvent, userId: string) {
  if (event.type === 'batch-started') {
    return {
      table: 'processing_batches' as const,
      operation: 'insert' as const,
      row: {
        id: event.batch.id,
        user_id: userId,
        file_count: event.batch.fileCount,
        app_version: event.batch.appVersion,
        parser_version: event.batch.parserVersion,
        browser_family: event.batch.browserFamily,
        os_family: event.batch.osFamily,
        environment: event.batch.environment,
      },
    }
  }

  if (event.type === 'attempt-recorded') {
    return {
      table: 'po_processing_attempts' as const,
      operation: 'insert' as const,
      row: {
        id: event.attempt.id,
        batch_id: event.attempt.batchId,
        user_id: userId,
        attempt_number: event.attempt.attemptNumber,
        file_size_bytes: event.attempt.fileSizeBytes,
        duration_ms: event.attempt.durationMs,
        outcome: event.attempt.outcome,
        failure_code: event.attempt.failureCode,
        detected_row_count: event.attempt.detectedRowCount,
        initially_clear_row_count: event.attempt.initiallyClearRowCount,
        initially_review_row_count: event.attempt.initiallyReviewRowCount,
        initial_flagged_cell_count: event.attempt.initialFlaggedCellCount,
        obscured_field_count: event.attempt.obscuredFieldCount,
      },
    }
  }

  return {
    table: 'processing_batches' as const,
    operation: 'update' as const,
    id: event.batch.id,
    row: {
      completed_at: new Date().toISOString(),
      complete_file_count: event.batch.completeFileCount,
      partial_file_count: event.batch.partialFileCount,
      failed_file_count: event.batch.failedFileCount,
      detected_row_count: event.batch.detectedRowCount,
      review_row_count: event.batch.reviewRowCount,
      duration_ms: event.batch.durationMs,
      retry_count: event.batch.retryCount,
      copy_count: event.batch.copyCount,
      download_count: event.batch.downloadCount,
      abandoned: event.batch.abandoned,
    },
    attempts: event.attempts.map((attempt) => ({
      id: attempt.id,
      final_review_row_count: attempt.finalReviewRowCount,
      final_flagged_cell_count: attempt.finalFlaggedCellCount,
      unique_edited_cell_count: attempt.uniqueEditedCellCount,
      edit_operation_count: attempt.editOperationCount,
      corrections_by_field: attempt.correctionsByField,
    })),
  }
}
