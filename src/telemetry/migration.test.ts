import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  new URL(
    '../../supabase/migrations/20260915070000_create_processing_telemetry.sql',
    import.meta.url,
  ),
  'utf8',
)

describe('processing telemetry migration', () => {
  it('keeps PO content out of the telemetry schema', () => {
    expect(migration).not.toMatch(/\b(file_name|filename|po_number|description|unit_price|total)\b/i)
  })

  it('enables user-scoped RLS and removes anonymous access', () => {
    expect(migration).toContain('alter table public.processing_batches enable row level security;')
    expect(migration).toContain('alter table public.po_processing_attempts enable row level security;')
    expect(migration).toContain('revoke all on table public.processing_batches from anon;')
    expect(migration).toContain('revoke all on table public.po_processing_attempts from anon;')
    expect(migration).toContain('where batch.id = batch_id')
  })

  it('schedules three-month telemetry retention', () => {
    expect(migration).toContain("now() - interval '3 months'")
    expect(migration).toContain("'purge-expired-po-processing-telemetry'")
  })
})
