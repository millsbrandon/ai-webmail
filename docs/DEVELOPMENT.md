# Local development

## Requirements

- Node.js 24 LTS and the npm version pinned in the root `package.json`.
- Docker Compose v2 for the repeatable PostgreSQL development service.
- No OpenClaw, external mail account, AI subscription, WhatsApp integration, or
  paid service is needed for foundation development.

## First run

1. Copy `.env.example` to `.env`, `.env.migrations.example` to
   `.env.migrations`, and `.env.compose.example` to `.env.compose`.
2. Replace every placeholder with a unique random local-only value. The
   migration/runtime URLs must use the corresponding role password from
   `.env.compose`. Do not reuse a production password.
3. Install the pinned workspace dependencies with `npm ci --ignore-scripts`.
4. Start PostgreSQL bound only to loopback:

   ```sh
   docker compose --env-file .env.compose up -d
   ```

   The initialization script creates a separate migration role, a
   non-superuser runtime role, and an isolated `webmail_test` database. The
   application process loads only `.env` and receives only the runtime
   connection string. Migration credentials are loaded only by migration
   commands from `.env.migrations`.
5. Apply the schema using the migration role:

   ```sh
   npm run db:migrate
   npm run db:migrate:test
   ```

6. Start the web app with `npm run dev`, then visit `http://localhost:3000`.
   `GET /api/health` reports only whether the app is configured and its
   PostgreSQL connection is reachable. It never returns connection details.
   The static design-system gallery is available at
   `http://localhost:3000/design-system`; it uses synthetic examples only.
   Set `APP_ORIGIN` to the exact browser origin used for the app. Mutation
   routes reject requests without that exact `Origin`; production origins must
   use HTTPS. WebAuthn derives its relying-party ID from this origin's
   hostname. A deployed hostname must be finalized before users enroll
   passkeys; use separate origins and credentials for localhost and staging.
7. In a separate terminal, `npm run worker:dev` starts the bounded worker
   process. It intentionally has no polling or job processors until their
   tracker tasks are implemented.

## Verification

With the local Compose database running and migrations applied, run:

```sh
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
npm run worker:build
npm audit
```

The integration test connects only to `webmail_test`. The Playwright suite
starts the web app locally, checks the disconnected landing page and database
health route, and runs axe checks for WCAG 2.2 A/AA and best-practice rules on
the landing page and both light/dark component gallery panels. The unit suite
computes contrast ratios directly from the semantic CSS tokens.
Authentication tests create only synthetic accounts and invitations in
`webmail_test`; they cover invitation redemption/replay, password hashing,
generic login errors, account cooldown, sessions, CSRF/origin checks,
session-bound/replay-resistant WebAuthn challenges, recovery-code rotation and
single-use sign-in, and browser passkey/recovery flows. The Chromium virtual
authenticator is protocol-test evidence only, not evidence of physical
iOS/macOS, Android, or Windows passkey support.
Install the browser before the first end-to-end run with
`npx playwright install chromium`. GitHub Actions runs the same checks using
ephemeral credentials and the repository's Compose database; it does not
deploy the application.

`docker compose down` stops the local database but keeps its named volume.
Do not use `docker compose down -v` unless you intentionally want to destroy
all local development data.

## Current scope

The application remains a local development foundation. W09/W10 provide
invite-only password/passkey authentication and one-time recovery codes for
synthetic users, but there is no public invitation issuance, production
provisioning, verified personal recovery address, source/IP rate limiter, or
mailbox membership/mail access. Do not use real user accounts. There are no
mailbox credentials, mail content, synchronization jobs, send routes, or
external integrations. The public landing page explicitly states that no
mailbox is connected. Use synthetic data only.
