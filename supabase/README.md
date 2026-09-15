# Supabase database setup

The migration in `migrations/` creates the diagnostic telemetry tables, their
row-level security policies, and a daily retention job.

Before applying the migration, enable **Supabase Cron** (`pg_cron`) in the
Supabase Dashboard under **Integrations → Cron**. The migration then schedules
the `purge-expired-po-processing-telemetry` job for 03:17 UTC each day. It
deletes batches older than three calendar months; their PO-attempt records are
deleted by the foreign-key cascade.

Apply the migration with the Supabase CLI after linking the project:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The application uses the publishable key and the signed-in user's session. Do
not put a service-role or secret key in the application environment.
