# Supabase pilot setup

The application keeps PDFs and extracted purchase-order values in the browser.
Supabase receives only authenticated, aggregate processing diagnostics.

## 1. Create and configure the project

1. Create a Supabase project in the closest appropriate region.
2. In **Authentication → Sign In / Providers → Email**, enable email and
   password sign-in.
3. In **Authentication → General Configuration**, turn off **Allow new users
   to sign up** and anonymous sign-ins.
4. In the Email provider settings, disable email confirmation for this pilot.
   Developer-created pilot users are immediately confirmed.
5. Set the production **Site URL** after deployment. Add
   `http://localhost:3000` while developing locally.

## 2. Configure the application

Copy `.env.example` to `.env.local` and fill in the URL and publishable key
from Supabase **Connect**. Never use a service-role or secret key in this app.

```powershell
Copy-Item .env.example .env.local
```

Add the same four values to the deployment provider's environment settings and
redeploy. `NEXT_PUBLIC_` values are intentionally browser-visible; the
database's Row Level Security policies protect the telemetry data.

## 3. Enable retention and apply the schema

Enable **Supabase Cron** (`pg_cron`) under **Integrations → Cron**, then apply
the tracked migration:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The scheduled job deletes processing batches older than three calendar months.
Associated PO-attempt records are removed automatically by the database
foreign-key cascade.

## 4. Create pilot accounts

In **Authentication → Users**, select **Add user** for each pilot. Create a
unique temporary password, mark the account as confirmed, and send the
credentials through a separate secure channel. Disable accounts from the same
dashboard when a pilot ends.

## 5. Verify before the first pilot

1. Sign in as two different pilot users and confirm each cannot see the other
   user's telemetry through the Supabase Table Editor/API.
2. Process an invented fixture PDF and inspect the browser's request to
   `/api/telemetry`.
3. Confirm the request contains counts, timings, outcome codes, and coarse
   browser/OS family only—never a filename, PO number, description, price, or
   PDF content.
4. Check **Integrations → Cron** after the first night to verify the retention
   job has run successfully.
