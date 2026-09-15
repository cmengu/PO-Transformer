-- Store only operational diagnostics. Purchase-order content, filenames, and
-- extracted values must never be written to these tables.

create schema if not exists private;
revoke all on schema private from public;

create table public.processing_batches (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  file_count integer not null check (file_count >= 0),
  complete_file_count integer not null default 0 check (complete_file_count >= 0),
  partial_file_count integer not null default 0 check (partial_file_count >= 0),
  failed_file_count integer not null default 0 check (failed_file_count >= 0),
  detected_row_count integer not null default 0 check (detected_row_count >= 0),
  review_row_count integer not null default 0 check (review_row_count >= 0),
  duration_ms integer check (duration_ms >= 0),
  retry_count integer not null default 0 check (retry_count >= 0),
  copy_count integer not null default 0 check (copy_count >= 0),
  download_count integer not null default 0 check (download_count >= 0),
  abandoned boolean not null default false,
  app_version text not null,
  parser_version text not null,
  browser_family text,
  os_family text,
  environment text not null check (environment in ('development', 'production'))
);

create table public.po_processing_attempts (
  id uuid primary key,
  batch_id uuid not null references public.processing_batches(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  attempt_number integer not null check (attempt_number > 0),
  file_size_bytes bigint not null check (file_size_bytes >= 0),
  page_count integer check (page_count > 0),
  duration_ms integer not null check (duration_ms >= 0),
  outcome text not null check (outcome in ('complete', 'partial', 'failed')),
  failure_code text check (
    failure_code is null or failure_code in (
      'invalid_file_type',
      'unreadable_file',
      'no_text',
      'unsupported_format',
      'parser_exception'
    )
  ),
  detected_row_count integer not null default 0 check (detected_row_count >= 0),
  initially_clear_row_count integer not null default 0 check (initially_clear_row_count >= 0),
  initially_review_row_count integer not null default 0 check (initially_review_row_count >= 0),
  final_review_row_count integer check (final_review_row_count >= 0),
  initial_flagged_cell_count integer not null default 0 check (initial_flagged_cell_count >= 0),
  final_flagged_cell_count integer check (final_flagged_cell_count >= 0),
  unique_edited_cell_count integer not null default 0 check (unique_edited_cell_count >= 0),
  edit_operation_count integer not null default 0 check (edit_operation_count >= 0),
  corrections_by_field jsonb not null default '{}'::jsonb,
  obscured_field_count integer not null default 0 check (obscured_field_count >= 0),
  check (
    (outcome = 'failed' and failure_code is not null) or
    (outcome in ('complete', 'partial') and failure_code is null)
  )
);

create index processing_batches_user_id_started_at_idx
  on public.processing_batches(user_id, started_at desc);

create index po_processing_attempts_batch_id_idx
  on public.po_processing_attempts(batch_id);

create index po_processing_attempts_user_id_created_at_idx
  on public.po_processing_attempts(user_id, created_at desc);

create or replace function private.set_telemetry_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger processing_batches_set_updated_at
before update on public.processing_batches
for each row execute function private.set_telemetry_updated_at();

create trigger po_processing_attempts_set_updated_at
before update on public.po_processing_attempts
for each row execute function private.set_telemetry_updated_at();

alter table public.processing_batches enable row level security;
alter table public.po_processing_attempts enable row level security;

revoke all on table public.processing_batches from anon;
revoke all on table public.po_processing_attempts from anon;
revoke delete on table public.processing_batches from authenticated;
revoke delete on table public.po_processing_attempts from authenticated;

grant select, insert, update on table public.processing_batches to authenticated;
grant select, insert, update on table public.po_processing_attempts to authenticated;

create policy "Users can read their own processing batches"
on public.processing_batches
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own processing batches"
on public.processing_batches
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own processing batches"
on public.processing_batches
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can read their own PO attempts"
on public.po_processing_attempts
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create PO attempts in their own batches"
on public.po_processing_attempts
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.processing_batches as batch
    where batch.id = batch_id
      and batch.user_id = (select auth.uid())
  )
);

create policy "Users can update their own PO attempts"
on public.po_processing_attempts
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function private.purge_expired_processing_telemetry()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.processing_batches
  where started_at < now() - interval '3 months';
end;
$$;

revoke all on function private.purge_expired_processing_telemetry() from public;

-- Supabase Cron runs this daily at 03:17 UTC. Deleting a batch cascades to
-- its associated attempts, enforcing the three-month retention period.
select cron.schedule(
  'purge-expired-po-processing-telemetry',
  '17 3 * * *',
  $cron$select private.purge_expired_processing_telemetry();$cron$
);
