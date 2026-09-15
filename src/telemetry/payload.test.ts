import { describe, expect, it } from 'vitest'
import { databasePayload } from './payload'

describe('telemetry database payloads', () => {
  it('derives the database user identity instead of accepting it from the client', () => {
    const payload = databasePayload(
      {
        type: 'batch-started',
        batch: {
          id: '9b5f78e4-d484-4635-9de8-c750d8a0cb7e',
          fileCount: 3,
          appVersion: '0.1.0',
          parserVersion: '1',
          browserFamily: null,
          osFamily: null,
          environment: 'development',
        },
      },
      'server-verified-user',
    )

    expect(payload).toMatchObject({
      table: 'processing_batches',
      operation: 'insert',
      row: {
        user_id: 'server-verified-user',
        file_count: 3,
      },
    })
    expect(JSON.stringify(payload)).not.toContain('filename')
    expect(JSON.stringify(payload)).not.toContain('poNumber')
  })
})
