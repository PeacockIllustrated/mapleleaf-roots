# RLS integration tests

These tests exercise the row-level security policies defined in
`supabase/migrations/20260420_000_initial_schema.sql`. They speak to a real
Supabase project so that the policies run in the same environment the app
does — no mocks, no simulators.

## What you need

- A dedicated Supabase project for testing (do **not** point these at
  production — the tests create and tear down users and rows).
- The project must have the two migrations applied and the seeds loaded.
- The service-role key for that project (kept out of source control).

## Configuration

Create `.env.test.local` at the repo root:

```bash
TEST_SUPABASE_URL=https://<test-project-ref>.supabase.co
TEST_SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
TEST_SUPABASE_ANON_KEY=<anon-key>
```

If any of these are missing, the tests skip themselves with a clear message —
they never silently pass.

## Running

```bash
pnpm test              # one-shot
pnpm test --watch      # watch mode
pnpm test rls          # just the RLS suite
```

## What they cover (so far)

- **cross-site-isolation.test.ts** — creates two Site Managers in two
  different areas and confirms that one cannot see the other's site when
  reading `public.sites`. This is the canonical M1 acceptance test.

## Adding more

Every new RLS policy should get a paired test here. Keep one file per
capability (`campaign-local-scope.test.ts`, `community-submission-visibility.test.ts`)
rather than one mega file.
