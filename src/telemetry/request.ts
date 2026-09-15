import { telemetryEventSchema, type ValidTelemetryEvent } from './schema'

export const MAX_TELEMETRY_BYTES = 32 * 1024

export type ParsedTelemetryRequest =
  | { event: ValidTelemetryEvent }
  | { response: Response }

export async function parseTelemetryRequest(request: Request): Promise<ParsedTelemetryRequest> {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_TELEMETRY_BYTES) {
    return { response: Response.json({ error: 'Payload too large.' }, { status: 413 }) }
  }

  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > MAX_TELEMETRY_BYTES) {
    return { response: Response.json({ error: 'Payload too large.' }, { status: 413 }) }
  }

  let input: unknown
  try {
    input = JSON.parse(text)
  } catch {
    return { response: Response.json({ error: 'Invalid JSON.' }, { status: 400 }) }
  }

  const parsed = telemetryEventSchema.safeParse(input)
  if (!parsed.success) {
    return { response: Response.json({ error: 'Invalid telemetry payload.' }, { status: 400 }) }
  }

  return { event: parsed.data }
}
