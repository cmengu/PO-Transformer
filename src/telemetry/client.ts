import type { TelemetryEvent } from './types'

const MAX_TELEMETRY_BYTES = 32 * 1024

export async function reportTelemetry(event: TelemetryEvent): Promise<void> {
  const body = JSON.stringify(event)
  if (new TextEncoder().encode(body).byteLength > MAX_TELEMETRY_BYTES) return

  try {
    await fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    })
  } catch {
    // Diagnostics must never interrupt a user's local PDF-processing workflow.
  }
}
