import { createClient } from '@/lib/supabase/server'
import { databasePayload } from '@/telemetry/payload'
import { telemetryEventSchema } from '@/telemetry/schema'

const MAX_TELEMETRY_BYTES = 32 * 1024

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_TELEMETRY_BYTES) {
    return Response.json({ error: 'Payload too large.' }, { status: 413 })
  }

  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > MAX_TELEMETRY_BYTES) {
    return Response.json({ error: 'Payload too large.' }, { status: 413 })
  }

  let input: unknown
  try {
    input = JSON.parse(text)
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = telemetryEventSchema.safeParse(input)
  if (!parsed.success) return Response.json({ error: 'Invalid telemetry payload.' }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthenticated.' }, { status: 401 })

  const payload = databasePayload(parsed.data, user.id)
  if (payload.operation === 'insert' && payload.table === 'processing_batches') {
    const { error } = await supabase.from('processing_batches').insert(payload.row)
    if (error) return Response.json({ error: 'Could not record telemetry.' }, { status: 500 })
    return Response.json({ ok: true }, { status: 201 })
  }

  if (payload.operation === 'insert') {
    const { error } = await supabase.from('po_processing_attempts').insert(payload.row)
    if (error) return Response.json({ error: 'Could not record telemetry.' }, { status: 500 })
    return Response.json({ ok: true }, { status: 201 })
  }

  const { error: batchError } = await supabase
    .from('processing_batches')
    .update(payload.row)
    .eq('id', payload.id)
    .eq('user_id', user.id)
  if (batchError) return Response.json({ error: 'Could not update telemetry.' }, { status: 500 })

  for (const attempt of payload.attempts) {
    const { error } = await supabase
      .from('po_processing_attempts')
      .update(attempt)
      .eq('id', attempt.id)
      .eq('user_id', user.id)
    if (error) return Response.json({ error: 'Could not update telemetry.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
