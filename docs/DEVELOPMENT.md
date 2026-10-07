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
   ```

6. Start the web app with `npm run dev`, then visit `http://localhost:3000`.
   `GET /api/health` reports only whether the app is configured and its
   PostgreSQL connection is reachable. It never returns connection details.
7. In a separate terminal, `npm run worker:dev` starts the bounded worker
   process. It intentionally has no polling or job processors until their
   tracker tasks are implemented.

`docker compose down` stops the local database but keeps its named volume.
Do not use `docker compose down -v` unless you intentionally want to destroy
all local development data.

## Current scope

This is only the runnable foundation. There are no user accounts, mailbox
credentials, mail content, synchronization jobs, send routes, or external
integrations yet. The public landing page explicitly states that no mailbox is
connected. Use synthetic data only.
