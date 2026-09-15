import { describe, expect, it } from 'vitest'
import { MAX_TELEMETRY_BYTES, parseTelemetryRequest } from './request'

describe('telemetry request protection', () => {
  it('rejects oversized payloads before authentication or database access', async () => {
    const parsed = await parseTelemetryRequest(
      new Request('http://localhost/api/telemetry', {
        method: 'POST',
        headers: { 'content-length': String(MAX_TELEMETRY_BYTES + 1) },
      }),
    )

    expect('response' in parsed && parsed.response.status).toBe(413)
  })

  it('rejects malformed and unrecognized payloads', async () => {
    const malformed = await parseTelemetryRequest(
      new Request('http://localhost/api/telemetry', { method: 'POST', body: '{' }),
    )
    const unrecognized = await parseTelemetryRequest(
      new Request('http://localhost/api/telemetry', {
        method: 'POST',
        body: JSON.stringify({ type: 'send-the-pdf', file: 'sensitive.pdf' }),
      }),
    )

    expect('response' in malformed && malformed.response.status).toBe(400)
    expect('response' in unrecognized && unrecognized.response.status).toBe(400)
  })
})
