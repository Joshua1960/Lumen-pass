# Lumen Pass

Lumen Pass is an event invitation and ticketing app. Hosts create events and private invitation links; attendees accept invitations to receive QR passes; hosts verify passes at the door.

## Local development

Install dependencies and run the frontend:

```sh
npm install
npm run dev
```

`npm run dev` starts Vite only. To run the frontend and the Vercel-style API handlers in `api/` together locally, use:

```sh
npm run dev:fullstack
```

This uses the Vercel CLI and may ask you to install it, sign in, or link the project the first time. The API also needs the server-only environment variables listed below. A frontend-only Vite session cannot complete profiles, tickets, or scans.

Useful checks:

```sh
npm run build
npm run lint
```

## Environment

Configure these values in your local environment and in the serverless deployment settings:

| Variable | Where it is used | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser | Supabase project URL, e.g. `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Browser | Supabase publishable/anon key; safe for browser use |
| `NEXT_PUBLIC_SUPABASE_URL` | API | Same project URL; `/rest/v1` suffix is accepted but should be omitted |
| `SUPABASE_SERVICE_ROLE_KEY` | API only | Privileged key; never use a `VITE_` prefix or expose it to the browser |
| `QR_SIGNING_SECRET` | API only | At least 32 bytes of private random material; required to issue and verify signed passes |

Generate a QR signing secret in PowerShell without printing it to the console:

```powershell
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$env:QR_SIGNING_SECRET = [Convert]::ToBase64String($bytes)
Set-Clipboard $env:QR_SIGNING_SECRET
$rng.Dispose()
```

The secret is copied to the clipboard without printing it. Add it to local `.env` and the API's deployment secret settings. Do not commit `.env` or deployment secrets.

The current sign-in screen supports email and password. A `VITE_GOOGLE_CLIENT_ID` value alone does not enable Google sign-in; configure an OAuth provider in Supabase and implement/use the corresponding sign-in flow before relying on it.

## Supabase database

The API uses the Supabase service key on the server and expects these tables and fields. Apply the tracked schema migrations to the linked project before using the app:

```sh
npx supabase link --project-ref <project-ref>
npx supabase db push --linked
```

The first migration creates or reconciles the tables below, including foreign keys, indexes, and row-level security. It preserves existing rows while correcting legacy column names and types. Tables have no direct-access policies: the server-side service key bypasses RLS, while browser access remains restricted.

- `profiles`: `id`, unique `user_id` referencing `auth.users.id`, `email`, `display_name`, `role` (`host` or `attendee`), optional `username`, and `created_at`.
- `events`: `id`, `host_id` referencing `auth.users.id`, `title`, `description`, `venue`, `address`, `starts_at`, `ends_at`, `capacity`, `dress_code`, `cover_url`, and `created_at`.
- `invitations`: `id`, `event_id`, unique `token`, `guest_name`, `guest_email`, `plus_ones`, `status`, optional `claimed_by`, `claimed_at`, `guest_phone`, `note`, and `created_at`.
- `tickets`: `id`, unique `invitation_id`, `event_id`, `attendee_id`, `qr_secret`, nullable `checked_in_at` and `checked_in_by`, and `created_at`.
- `scan_logs`: `id`, `event_id`, nullable `ticket_id`, `result` (`valid`, `duplicate`, or `invalid`), nullable `guest_name`, `scanner_id`, and `created_at`.

Use ID types and foreign keys consistently across these tables. Add a unique constraint on `tickets.invitation_id` so accepting the same invitation cannot issue multiple tickets. The service key bypasses row-level security; keep it server-side and retain the API's user and event-ownership checks. Review and enable appropriate RLS policies before exposing any direct browser database access.

The second migration serializes invitation acceptance per event, counts accepted attendees and plus-ones against capacity, and makes ticket issuance unique per invitation.

## Deployment checklist

1. Create/configure a Supabase project, enable email/password authentication, and apply the database migrations.
2. Deploy the frontend and `api/` handlers together, or configure a same-origin `/api/*` rewrite to the deployed API.
3. Set all environment variables in the hosting provider; set `QR_SIGNING_SECRET` to a stable secret so existing QR passes remain verifiable between deployments.
4. Configure the deployed site's URL and allowed redirect URLs in Supabase Auth.
5. Test sign-up/profile creation, event and invitation creation, acceptance/ticket issuance, QR scanning (including duplicate scans), profile updates, and the deployed camera flow.

Automatic email delivery is not configured. Invitation and ticket screens currently offer links and email drafts for the user to send manually.
