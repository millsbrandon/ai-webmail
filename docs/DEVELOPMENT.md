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
7. In a separate terminal, `npm run worker:dev` starts the bounded worker.
   W14 supports only explicitly enqueued synthetic empty polls; it does not
   provision schedules, connect to a mail provider, or call AI. The process
   requires the runtime `DATABASE_URL` and handles SIGINT/SIGTERM cleanly.

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
W11 tests create synthetic organizations, mailboxes and explicit memberships.
They verify the Owner/A/B matrix, no implicit owner/administrator content
access, role/capability flags, tenant foreign keys, guessed IDs and immediate
revocation through shared services and authenticated HTTP routes. No provider
connection or actual mail object is needed.
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
provisioning, verified personal recovery address, or source/IP rate limiter.
W11 adds unprovisioned organization/mailbox memberships and scoped metadata
reads only. Do not use real user accounts. There are no
mailbox credentials, mail content, provider synchronization jobs, send routes, or
external integrations. The public landing page explicitly states that no
mailbox is connected. Use synthetic data only.

## Mailbox authorization foundation

- `packages/domain` owns the shared mailbox capability/query service. Callers
  supply the authenticated user ID and explicit organization scope, not a
  client-asserted user ID. All queries require active users, active mailboxes,
  organization membership, explicit mailbox membership and the requested
  capability before returning rows. Results are not cached.
- `GET /api/organizations/{organizationId}/mailboxes` lists only authorized
  mailbox metadata and effective capabilities. The corresponding
  `/{mailboxId}` route returns the same non-disclosing 404 for nonexistent,
  inaccessible and malformed IDs. Both routes require an active session and
  return `Cache-Control: no-store`; no provider configuration is returned.
- Owners must have explicit mailbox membership, provisioned for every mailbox
  during future audited setup. Neither owners nor administrators bypass
  content permissions. No grant/provisioning API is implemented; any future
  such API must apply W12's privileged reauthentication and audit controls.
- Viewers only read, regardless of optional flags. Responders can compose,
  send and collaborate; managers additionally manage templates. Managers
  default to AI approval and rules management, with nullable `approve_ai` and
  `manage_rules` overrides (`null` = role default, `false` = deny, `true` =
  explicit grant for contributors). Export and delete always require explicit
  flags. These capabilities are policy decisions, not enabled send/AI features.
- Future object/search/download/stream/send services must reuse these
  predicates with their mailbox-scoped queries; checking metadata access and
  then fetching objects without tenant/mailbox scope is not sufficient.

## Session revocation and audit

The authenticated login/security screen lists active sessions with approximate
browser/platform labels, sign-in method and timestamps. Only a fixed
classification is stored, not raw user-agent strings or IP addresses. Sessions
from before W12 are labelled `unknown` method rather than fabricating history.

- `GET /api/auth/sessions` returns only the current user's live sessions and
  never tokens/hashes. `DELETE /api/auth/sessions/{sessionId}` revokes an owned
  session; `DELETE /api/auth/sessions` revokes all other sessions. Both
  mutations require exact origin, session-bound CSRF and authentication within
  five minutes. Ordinary sign-out remains possible without recent reauthentication.
- `POST /api/organizations/{organizationId}/users/{userId}/disable` is
  owner-only, session-CSRF/origin protected and recent-auth gated. It rejects
  self/owner accounts and accounts belonging to multiple organizations, so an
  owner cannot disable another organization's users or remove the last owner.
  There is no general administrator bypass or account-enable endpoint.
- Disabling a user revokes every session. Session creation and disabling lock
  the same user row, preventing a concurrent login from escaping revocation.
  Recovery-code sign-in also revokes all older sessions. Credential changes
  recheck the active/recent session inside the mutation transaction.
- Successful session creation/revocation, account disable, passkey
  registration/removal and recovery-code rotation append an `app.audit_events`
  record in the same transaction. Records contain actor/actor-session IDs,
  optional organization, action, target, success outcome, timestamp and a
  server-generated correlation ID; no passwords, tokens/hashes, mail content
  or free-form metadata are stored.
- Audit actor/target IDs deliberately have no cascading foreign keys, so
  deleting an account/session cannot erase its attribution. Runtime-role
  UPDATE/DELETE/TRUNCATE on this table are revoked by the W12 migration.
  This is append-only for that role, not tamper-proof against database/server
  administrators or a compromised runtime that can append misleading rows.
  No public audit-export endpoint is implemented.
- Tests use only synthetic identities. Audit records intentionally survive
  test-user cleanup; use an isolated test database, never a live database.
  Failed-request auditing, retention policy, user provisioning, password-change
  UI, owner recovery and queued-send invalidation remain later release work.

## Synthetic durable scheduler

W14's shared `@ai-webmail/domain/poll-queue` service stores one unique recurring
`synthetic.poll` job per organization/mailbox. `enqueueSyntheticPoll` accepts a
database transaction, so future setup can atomically create mailbox metadata and
its job; duplicate enqueue preserves existing state and due time. There is no
public enqueue route or automatic enrollment of mailboxes.

- The worker checks for due jobs once per second, processes one at a time, and
  uses PostgreSQL `FOR UPDATE SKIP LOCKED` to avoid competing claims.
- A successful empty poll persists its next due time 60 seconds after completion.
  This avoids catch-up storms after downtime. Queue backlog, the one-second
  scan interval and processing duration add scheduling delay; this is not an
  instant-delivery or strict 60-second start guarantee.
- Claims receive a random fencing token and a 30-second lease. Expired claims
  are recoverable after process failure. Completion/failure requires the same
  current, unexpired lease; stale workers cannot overwrite a replacement.
- Failures use exponential delay from one second, plus up to 25% jitter, and
  stop after five attempts. Repeated lease expiry also exhausts that budget.
  Terminal jobs remain visible as `failed`; there is no automatic/manual retry
  endpoint yet. Only fixed error categories are stored, never arbitrary errors,
  credentials, user content or request payloads.
- Disabled mailboxes are not claimed. Composite foreign keys enforce tenant
  identity. No user-controlled job payload, handler name or provider credentials
  are accepted. Runtime DB access is a service trust boundary, not row security.
- Only an empty synthetic processor is wired. Future mail processors must add
  lease renewal/cancellation, mailbox credential/authorization checks and
  idempotent side effects before they may run. Fencing queue updates alone
  cannot prevent a stale process from performing external I/O or guarantee
  exactly-once mail delivery.

`npm run test:integration` includes isolated queue tests. The 120-cycle test
advances explicit timestamps through two logical hours, rather than waiting two
hours; it proves due-time boundaries and zero fetch calls, not provider polling.
Additional tests cover competing/locked claims, rollback, retry exhaustion,
stale completion, a replacement database connection, and actual worker-process
restart/shutdown.

`npm run worker:build` typechecks shared TypeScript and bundles first-party
workspace modules with exact-pinned esbuild; `pg`/Drizzle stay external installed
dependencies. `npm run worker:start` runs the emitted JavaScript with no
TypeScript runtime loader.

## Disconnected mailbox setup preview

After signing in, use **Preview synthetic mailbox setup (owners only)** or
visit `/mailbox-setup`. The three steps cover metadata/history, folder mapping
and review. The catalog is available only to authenticated users and lists only
organizations where the user is an owner. There is no implicit administrator
or mailbox-manager provisioning permission.

`GET /api/mailbox-setup` returns that owned-organization catalog and clearly
labelled synthetic folders. `POST /api/mailbox-setup` validates a preview for an
owned organization, requiring exact origin, session CSRF and authentication
within five minutes. It rechecks active session/ownership transactionally.
Responses are private/no-store. Invalid or inaccessible organization IDs use the
same non-disclosing error; users without owned organizations see an explanation,
not an automatically created organization.

The preview accepts only mailbox name, a `.test` address, one of the bounded
history windows (new messages only, 30/90/365 days), and five folder roles.
Folder suggestions use unique selectable special-use flags (INBOX is the
protocol-defined name), not English name heuristics. All roles require distinct,
selectable paths from the supplied fixture catalog; ambiguous/missing folders
must be resolved explicitly. Paths preserve provider case. Unknown settings,
credentials and arbitrary provider hosts are rejected without echoing values.

The result explicitly reports `providerVerified: false`, `persisted: false`
and `sendingEnabled: false`. There is no save/connect/send action, credential
field, DNS resolution, provider adapter or job enqueue. This is W13 preparation,
not a completed connection wizard or proof of TLS/provider compatibility.
Real provider integration remains blocked on the recorded G2/W13 gates.

The browser regression signs in normally, follows the setup link, corrects a
duplicate folder, reviews and edits the preview, checks accessibility and all
three steps at eight viewport widths, and asserts no external browser requests.
Sign-in clears the cached pre-authentication CSRF request after rotating the
session token so subsequent client navigation obtains the current token.
