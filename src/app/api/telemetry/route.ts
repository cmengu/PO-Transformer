import { createClient } from '@/lib/supabase/server'
import { databasePayload } from '@/telemetry/payload'
import { parseTelemetryRequest } from '@/telemetry/request'

export async function POST(request: Request) {
  const parsed = await parseTelemetryRequest(request)
  if ('response' in parsed) return parsed.response

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthenticated.' }, { status: 401 })

  const payload = databasePayload(parsed.event, user.id)
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
