# AI Webmail — Gated Work Tracker
Version 1.0 • 7 October 2026

Companion: AI_WEBMAIL_DESIGN_PLAYBOOK.md. Product: standalone open-source codebase; NO OpenClaw runtime.

## Current truth
Implementation completed: **9 / 40 tasks**. No implementation or release task is marked complete merely because its design exists. W01, W05–W09, W11–W12 and W14 are done. G0 is exited for foundation work with W02–W04 explicitly blocked. G1 is technically exited for G2 local implementation; W10 remains blocked on device/recovery evidence. G2 has not exited and W13 is blocked under D016. W14's independent synthetic queue infrastructure is verified under D017; W13's disconnected preview is verified under D018 and W15's pure fixture reconciliation core under D019, but provider synchronization is not implemented. Production authentication/provisioning and all external integrations remain disabled.

Documentation deliverables: design playbook and this tracker authored; document checks are separate from implementation progress.

## Mandatory work protocol
States: todo → in_progress → review → done; or blocked. Only one task in_progress. Dependencies follow listed order unless a recorded decision explicitly allows independent work. Operate autonomously: do not wait for routine owner check-ins, preference questions with a clear safe default, or ceremonial approval. The implementer may technically review and record a phase gate once all written criteria and evidence are satisfied. This does not replace approvals required for live customer data, external sends, paid services, production changes/deployment, or AI/WhatsApp enablement. Blocked tasks remain blocked; continue other permitted work. Optional features can be deferred only by named scope decision, remain tracked, and must be disabled in release. Never cross a security/send gate just to keep busy.

Before task: confirm dependencies, owner, acceptance IDs, branch/commit and test plan. After: record changed files, test commands/results, evidence paths, risks, rollback and reviewer. No evidence means not done. Capture actual completion counts, not estimates. Update this file with each meaningful transition and keep a commit history.

## G0 — Design and feasibility
Entry: No feature implementation until baseline reviewed.
Gate status: EXITED FOR FOUNDATION WORK WITH EXPLICIT BLOCKERS. Reviewer/date: owner direction, 7 October 2026.

| ID | Task | Status | Required completion evidence | Acceptance |
|---|---|---|---|---|
| W01 | Approve baseline/name/license; bootstrap dedicated local and GitHub repository | done | Approved GitHub owner/name/license; sanitized docs baseline committed and pushed; remote SHA verified | A01–A15 |
| W02 | Prove supported subscription route without paid fallback | blocked | Official terms/auth flow documented; test request and quota-stop behavior evidenced | A13 |
| W03 | Assess WhatsApp group route and privacy | blocked | Supported route, fees and risks documented; blocked if zero-cost path unproved | A14 |
| W04 | Confirm mailbox/provider, users, sources and retention | blocked | Endpoint/folder sheet, membership matrix and approved FAQ list signed off | A01,A02 |

Exit: task evidence reviewed; failures resolved or explicitly blocking. Gate signature and release impact recorded before next phase.

## G1 — Repository and environment
Entry: G0 baseline approved; unresolved integrations stay disabled.
Gate status: EXITED FOR G2 LOCAL IMPLEMENTATION ONLY. Technical reviewer/date: Copilot technical evidence review under D012, 8 October 2026. W05–W08 are done; W08 local checks and both GitHub Actions workflows passed on `d1c3976b32b31ee9e120778c3a4ca429705b3af3`. No production users, credentials, mailboxes, or external services are enabled by this transition.

| ID | Task | Status | Required completion evidence | Acceptance |
|---|---|---|---|---|
| W05 | Add code structure, threat model, dependency/license inventory to bootstrapped repo | done | Pinned lockfile, secret scan, architecture decision record; task branch pushed | A01 |
| W06 | Set up web/worker/database skeleton and migrations | done | Repeatable local start; least-privileged DB roles; isolated test DB | A04 |
| W07 | Set up tests and CI | done | Typecheck, lint, unit/integration/e2e/accessibility checks run | A01–A15 |
| W08 | Implement design tokens and component gallery | done | All states, both themes, icon registry, contrast report | A10 |

Exit: task evidence reviewed; failures resolved or explicitly blocking. Gate signature and release impact recorded before next phase.

## G2 — Authentication and isolation
Entry: G1 verified.
Gate status: BLOCKED ON W10 DEVICE/RECOVERY EVIDENCE. Reviewer/date: Copilot technical evidence review under D012–D016, 10 November 2026; W09/W11/W12 complete, W10 blocked on physical-device/recovery evidence. G2 has not exited. Authentication remains unprovisioned outside local synthetic development.

| ID | Task | Status | Required completion evidence | Acceptance |
|---|---|---|---|---|
| W09 | Implement invite-only users and password auth | done | Hash/cooldown/session/CSRF tests; invitation expiry/replay; no enumeration | A03 |
| W10 | Implement passkeys and recovery | blocked | Real-device passkey evidence, challenge replay/origin tests, recovery drill | A03 |
| W11 | Implement mailbox memberships and capability service | done | Owner/A/B fixture passes direct API and object access tests | A01,A02 |
| W12 | Implement session revocation and audit | done | Immediate disabled-user rejection, privileged reauth, attributable events | A01,A07 |

Exit: task evidence reviewed; failures resolved or explicitly blocking. Gate signature and release impact recorded before next phase.

## G3 — Mail storage and code-only sync
Entry: G2 security gate reviewed before real mailbox connection.
Gate status: BLOCKED FOR PROVIDER WORK under D016–D019. Reviewer/date: Copilot technical gate review, 10 November 2026. W13 still requires the unresolved G2 security evidence and complete W04 configuration. Independent W14 synthetic queue work is verified under D017; W13's disconnected preview is verified under D018, without provider access. W15's pure fixture metadata planner is verified under D019. No real mailbox connection has started. W15/W16 provider import/storage work has not started.

| ID | Task | Status | Required completion evidence | Acceptance |
|---|---|---|---|---|
| W13 | Build mailbox connection wizard and folder mapping | blocked | Offline owner-only mapping preview under D018; full connection/TLS/credential acceptance still blocked by G2/W10 and W04 | A05 |
| W14 | Implement durable queue/scheduler and leases | done | 120 empty cycles, restarts, retries and no AI requests; synthetic-only independent work under D017 | A04 |
| W15 | Implement incremental import and reconciliation | blocked | D019 fixture-only metadata planner verified; full provider/persistence work blocked on W13. UID reset, moves, duplicate/missing IDs and historical suppression required | A05,A15 |
| W16 | Implement MIME/thread/attachment storage | todo | Bounds, safe parsing, scoped downloads and correct threading tests | A01,A05 |

Exit: task evidence reviewed; failures resolved or explicitly blocking. Gate signature and release impact recorded before next phase.

## G4 — Responsive webmail and drafts
Entry: G3 data fixtures pass.
Gate status: NOT STARTED. Reviewer/date: —

| ID | Task | Status | Required completion evidence | Acceptance |
|---|---|---|---|---|
| W17 | Build responsive shell/list/thread navigation | todo | Viewport/theme snapshots, back/scroll and keyboard flow | A10 |
| W18 | Build search, labels, folders and per-user read state | todo | Permission-scoped search/counts, provider flags reconciled | A01,A02 |
| W19 | Build composer and draft version/sync | todo | Autosave/conflict/attachment/signature/recipient tests | A07,A15 |
| W20 | Build internal notes, attribution and assignment | todo | No internal content in customer MIME; actor recorded | A02,A07 |

Exit: task evidence reviewed; failures resolved or explicitly blocking. Gate signature and release impact recorded before next phase.

## G5 — Sending safety
Entry: G4 complete; outbound only to owned test addresses.
Gate status: NOT STARTED. Reviewer/date: —

| ID | Task | Status | Required completion evidence | Acceptance |
|---|---|---|---|---|
| W21 | Implement reviewed send intents and outbox | todo | Atomic idempotency, fixed From, stale/revoked approval rejection | A02,A06,A07 |
| W22 | Implement SMTP and Sent reconciliation | todo | Accepted/unknown/failure states; no blind retry after ambiguous acceptance | A06,A15 |
| W23 | Implement schedule, undo and follow-up cancellation | todo | Undo only before SMTP; replies cancel queued follow-ups | A06,A07 |
| W24 | Owner reviews working shared inbox flow | todo | Real owned-recipient send, both mailbox identity/permission scenarios | A01,A02,A15 |

Exit: task evidence reviewed; failures resolved or explicitly blocking. Gate signature and release impact recorded before next phase.

## G6 — Knowledge and AI assistance
Entry: G5 complete; G0 subscription proof mandatory for real AI.
Gate status: NOT STARTED. Reviewer/date: —

| ID | Task | Status | Required completion evidence | Acceptance |
|---|---|---|---|---|
| W25 | Build approved FAQ/template ingestion and scoped retrieval | todo | SSRF prevention, freshness, source permissions and current-policy precedence | A08 |
| W26 | Implement AI adapter and bounded jobs | todo | Quota/auth stop, escaped structured output, manual mail unaffected | A08,A13 |
| W27 | Build draft/summary/rewrite/source review UI | todo | Sources/diff/uncertainty visible; edits invalidate approval | A07,A08 |
| W28 | Evaluate customer/privacy/prompt-injection fixtures | todo | Document factual accuracy failures; no unsupported auto-send | A08 |

Exit: task evidence reviewed; failures resolved or explicitly blocking. Gate signature and release impact recorded before next phase.

## G7 — Rules and notifications
Entry: G6 complete; external automation requires owner review.
Gate status: NOT STARTED. Reviewer/date: —

| ID | Task | Status | Required completion evidence | Acceptance |
|---|---|---|---|---|
| W29 | Build spam rules, templates and rule dry-run | todo | Rule order, spam exclusion and loop tests | A09 |
| W30 | Build controlled acknowledgement modes | todo | Off default, caps/exclusions/kill switch and owner-approved copy | A09 |
| W31 | Build notifications adapter and review permissions | todo | Group-to-mailbox audience mapping; link-only if membership unverified | A01,A14 |
| W32 | Integrate and test WhatsApp only if feasibility passed | todo | No paid dependency; verified recipient/approver/version; otherwise BLOCKED | A14 |

Exit: task evidence reviewed; failures resolved or explicitly blocking. Gate signature and release impact recorded before next phase.

## G8 — Hardening and release qualification
Entry: Core features tested; unresolved features explicitly out of release.
Gate status: NOT STARTED. Reviewer/date: —

| ID | Task | Status | Required completion evidence | Acceptance |
|---|---|---|---|---|
| W33 | Run full browser/device/accessibility matrix | todo | Actual versioned device results, contrast and overlap checks | A03,A10 |
| W34 | Profile cold load and resource/load behavior | todo | Five-run production reports and 5-user load while polling | A11 |
| W35 | Security review and backup restore drill | todo | Authorization suite, secret scan, safe HTML, clean restore evidence | A01,A08,A12 |
| W36 | Owner acceptance and release checklist | todo | All launch-critical gates passed; deferred/blocked scope explicitly accepted | A01–A15 |

Exit: task evidence reviewed; failures resolved or explicitly blocking. Gate signature and release impact recorded before next phase.

## G9 — Deployment and cutover
Entry: G8 owner sign-off; no unapproved package or paid service changes.
Gate status: NOT STARTED. Reviewer/date: —

| ID | Task | Status | Required completion evidence | Acceptance |
|---|---|---|---|---|
| W37 | Inspect and archive FreeScout and server config | todo | Checked backup, all related workers/cron/dependencies identified | A12 |
| W38 | Stage least-privileged app and dark-launch sync | todo | TLS/private ports/resources, read-only parity and health checks | A04,A11 |
| W39 | Cut over hostname with rollback ready | todo | nginx test, login, sync, owned-recipient send, pending sends reconciled | A02,A06,A15 |
| W40 | Verify operations then retire obsolete FreeScout components | todo | Operational report, restore path, no unrelated services removed | A12 |

Exit: task evidence reviewed; failures resolved or explicitly blocking. Gate signature and release impact recorded before next phase.

## GitHub checkpoint requirement
Implementation is in VS Code with GitHub Copilot. Follow playbook §14 GitHub protocol. Commit and push each coherent tested change and at session end. Main stays releasable; task branches/PRs carry work. Record remote URL, branch, commit SHA, tests and push verification. Secrets, real mail and private server handoff never enter Git. No auto-deploy on push. Repository creation occurs in W01; W05 expands it.

## Task evidence record template
- Task ID / status / owner:
- Start / review / completion date:
- Requirement and acceptance IDs:
- Dependency/gate checked:
- Changed files / migration / commit:
- Tests: exact commands, result, environment, skipped tests and reason:
- Evidence paths: screenshots, logs with secrets removed, measurements:
- Permission/privacy/cost consequences:
- Rollback steps:
- Reviewer and sign-off:
- GitHub remote / pushed branch / remote SHA / PR / push verification:
- Next permitted task:

## Test evidence register
A01–A15: **NOT RUN**. See playbook §13 for full definitions. Store results under docs/evidence/<task-id>/<date>/; synthetic customer data only in public repo. Private live test evidence stays outside published source with sanitized summary.

## Decision register
D001: Standalone code, not OpenClaw — user direction confirmed.
D002: Source may be open-source, private deployment/data — user direction confirmed; license pending.
D003: Shared inbox membership and internal per-person attribution — required; in first release, not deferred.
D004: Poll every minute in code, no AI empty checks — required.
D005: No additional spend/paid fallback — required, integration gates enforce.
D006: Next.js + PostgreSQL + bounded worker — proposed baseline; host performance proof pending.
D007: Official WhatsApp Groups API requires an Official Business Account and uses per-message pricing; no guaranteed zero-cost route to the existing private group has been proven. Keep integration disabled unless owner later approves a verified, in-budget route.
D008: Codex documentation describes subscription-authenticated use in Codex products and SDK/app integration for coding tasks; it does not prove this self-hosted email-drafting use is eligible or that this account can use it. Do not use API billing or an unsupported client; AI remains disabled pending explicit proof.
D009: Shared provider Seen versus per-user unread — app keeps per-user read cursors.
D010: SMTP ambiguity — delivery_unknown, no blind resend; do not promise exactly once.
D011: Owner approved the repository baseline and requested implementation start. Proceed with repository/environment groundwork while AI, WhatsApp, live mailbox access, and deployment remain blocked pending their specific gates.
D012: On 8 October 2026 the owner directed autonomous progress without waiting for routine owner sign-off. Continue local, reversible work and make documented technical phase reviews when evidence satisfies the written criteria. This does not waive live-data, external-send, paid-service, production/deployment, AI, WhatsApp, or other explicitly stated safety gates.
D013: G1 technical exit authorizes local G2 implementation only; it does not enable production authentication or user invitations. W09 remains invite-only and synthetic in development. No public self-registration, live invitations, or deployment is in scope.
D014: On 10 November 2026, following the owner's renewed direction to continue autonomous work, technical review permits W11 synthetic authorization implementation independently of W10's unavailable physical-device/recovery evidence. W10 is blocked, not complete; no device result is inferred. W11 depends on the verified W09 session contract, not physical authenticators. Only W11 is in progress. This supersedes the earlier W10 handoff's blanket sequencing restriction, not A03 or the G2 exit gate; real mailbox connections, production provisioning and all external safety gates remain blocked.
D015: W11 local and CI acceptance evidence is verified on 10 November 2026; proceed to W12 synthetic session-revocation/audit work using W09/W11 contracts independently of W10's physical-device blocker. No G2 exit or production enablement is implied. Only one implementation task is active at a time; W10 remains blocked.
D016: On 10 November 2026 W12's synthetic scope passed local checks and both Linux CI runs at `38983ddfc0ff6c969c86a6f8d3d80590cc3c7378`. W12 is complete, but technical review cannot exit G2 without W10's required physical-device/recovery evidence. W13 is blocked on that security gate and W04's unconfirmed provider/folder configuration and isolated owned-test scope. D014/D015 permitted only the independent W11/W12 tasks; they do not waive the next phase's entry requirements. No routine owner sign-off is requested or awaited, and no integration, live-data, external-send or production gate is bypassed.
D017: Following the owner's renewed direction to continue on 10 November 2026, proceed with W14's independent PostgreSQL queue/scheduler infrastructure using synthetic fixtures only. W14 depends on the verified database/mailbox identity contracts, not provider access or the remaining physical-device matrix. Only a synthetic empty-poll processor may run; no provider credentials, network mail, AI, notifications or sending are enabled. This narrow local exception supersedes D016's blanket G3 implementation restriction, not G2 exit or W13's connection gate. The supplied test-mailbox scope and verified public provider settings are acknowledged privately; W04's production inventory/retention and remaining W10 evidence are not inferred complete. Only W14 is in progress.
D018: On 10 November 2026 the owner requested continued autonomous work. W14 is verified; W13 may now implement an owner-scoped disconnected setup preview with synthetic folder fixtures and .test addresses. No provider settings/credentials are accepted, no DNS/TLS/mail connection is attempted, and no mailbox/job is persisted. This permits development of validation, mapping and accessible navigation without waiving D016's real-connection/G2 gate. W13 stays blocked overall until its connection/TLS/credential and owned-test requirements are satisfied. Only this W13 local preparation is active; do not mark the entire task done for a preview.
D019: With D018's preview verified, continue only W15's pure fixture reconciliation core under the owner's autonomous-development direction. Its input contract is complete, bounded, decoded folder inventories scoped to one organization/mailbox; its output is a proposed metadata delta, not database writes or provider commands. Test UIDVALIDITY replacement, stable UID identity independent of Message-ID, flags/removals, cautious move hints and sticky historical suppression. This preparation does not require the absent provider adapter; it must not be wired to the scheduler, exposed by an API, fetch mail, store customer content, or produce AI/notification/send jobs. Full W15 remains blocked on W13/provider contracts and transactional persistence/restart evidence. No phase gate is exited, and W16 is not started. Only this local W15 preparation is active.

## W02/W03 independent feasibility research — 7 October 2026

Research was done from official public documentation while W01 remote setup was in progress. It does not complete either task: no live account eligibility, owner acceptance, integration test, or cost authorization has been obtained.

- Local evidence checkpoint: branch `docs/W02-W03-feasibility`; latest verified push before this tracker update: `71c5f21c69fbd6ca8a348b9747d4e821d6650e9c`.

### W02 — ChatGPT/Codex subscription route

- Status: **blocked**. Official Codex documentation describes ChatGPT subscription sign-in for Codex desktop, CLI, and IDE surfaces, and a Codex SDK for integrating Codex into applications for coding tasks. It does not establish that this private webmail app may use subscription access for customer-email drafting or that the owner’s specific plan/account is eligible.
- The same documentation identifies API-key use as standard usage-based billing. That is not an allowed fallback. No account credentials, tokens, cookies, or private session data were accessed.
- Required next evidence: an owner-authorized, official route explicitly suitable for this application and plan, plus a bounded test request and demonstrated quota/auth stop. Without that evidence, AI stays disabled and manual email remains available.
- Sources: [Codex authentication](https://developers.openai.com/codex/auth/); [Codex SDK](https://developers.openai.com/codex/sdk/).

### W03 — WhatsApp group route

- Status: **blocked**. Meta documents a Groups API for businesses with an Official Business Account (OBA); groups are invite-only, the documented maximum is 8 participants, and WhatsApp Business App phone numbers are not eligible. This documents an official group feature, but does not prove access to the owner’s existing private group.
- Meta prices the Groups API per delivered billable message per recipient. Some messages can be free during an open group customer-service window, but that is conditional and does not establish a guaranteed zero-cost notification path. No OBA status or billing eligibility was inspected, and no spend is authorized.
- Keep WhatsApp disabled unless the owner verifies eligibility, confirms the target group/audience, and explicitly approves any unavoidable costs and risks. Do not substitute an unofficial linked-device client.
- Sources: [Meta Groups API](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups); [Groups API pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/pricing); [WhatsApp Business Platform pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing).

### W04 — mailbox and policy configuration

- Status: **blocked**. The handoff does not supply confirmed provider endpoints/folders, mailbox credentials, the actual staff list and access matrix, approved FAQ sources, or retention/recovery destinations. Example mailbox addresses and example colleague access are requirements, not verified configuration.
- Do not read FreeScout mail or extract credentials to fill these gaps. Use synthetic fixtures until the owner provides task-specific configuration and approves any live-mail scope.

## W01 repository bootstrap checkpoint — 7 October 2026

- Status: **done**; owner approved beginning implementation on 7 October 2026. Local bootstrap, first public push, and remote SHA verification are complete.
- Approved destination: `millsbrandon/ai-webmail`; project name: AI Webmail; license: AGPL-3.0-only.
- Local baseline: standalone Git repository on `main`; sanitized design documents, license, README, `.gitignore`, `AGENTS.md`, and `.github/copilot-instructions.md`. Baseline commit `d5db2add8e20a013bb08ca172b24a607b79f5f3a` is pushed to `origin/main`; `git ls-remote` verified the exact SHA.
- Validation: `git diff --check` passed. Gitleaks 8.30.1 scanned all local Git history (`gitleaks git --no-banner --redact --log-opts='--all' .`) with no leaks found. The targeted scan also found no private business domain, server IPs, private key path, private-key header, GitHub token pattern, or AWS access-key pattern. No application tests apply; no application code exists.
- Privacy/cost: synthetic/public examples only; no credentials, customer mail, private deployment inventory, or paid services added. AI and WhatsApp remain blocked pending eligibility and cost proof.
- Rollback: no remote or live-system changes have occurred; any correction should be made as a normal follow-up commit.
- GitHub: public repository `https://github.com/millsbrandon/ai-webmail`; `main` remote SHA verified as `d5db2add8e20a013bb08ca172b24a607b79f5f3a`. Review PR [#1](https://github.com/millsbrandon/ai-webmail/pull/1) is open and unmerged. Feasibility branch SHA `71c5f21c69fbd6ca8a348b9747d4e821d6650e9c` was verified against the remote before this tracker update.
- G0 exit decision: proceed with foundation work only; W02–W04 remain explicitly blocked. No AI/WhatsApp integration, real mailbox access, customer mail, or deployment is authorized by this decision.
- Next permitted task: W05, branch `feat/W05-security-structure`, based on the open W01 review PR.

## W05 foundation checkpoint — 7 October 2026

- Status: **done**; repository foundation only. No mail UI, mailbox connection, authentication endpoint, worker, AI, WhatsApp, or deployment has been implemented.
- Branch: `feat/W05-security-structure`, stacked on W01 review branch `docs/W02-W03-feasibility`; PR [#2](https://github.com/millsbrandon/ai-webmail/pull/2) is open and unmerged.
- Changed: Node 24/npm pin, exact-pinned TypeScript development tool and lockfile; repository structure, initial threat model, dependency/license inventory, ADR-0001; persistent contributor/Copilot validation guidance and README links.
- Tests/checks: official Node.js 24.21.0 ARM64 archive SHA-256 verified against Node.js `SHASUMS256.txt`; `npm ci --ignore-scripts` passed; `npm exec -- tsc --version` reported 7.0.2; `npm audit` reported 0 vulnerabilities; `git diff --cached --check` passed. Gitleaks 8.30.1 scanned 7 commits of all Git history and the staged W05 changes; no leaks found.
- Dependency scope: only TypeScript is currently installed. Other listed versions are public-registry candidate snapshots, not installed or security-approved; full license/advisory review is required when they enter W06/W07 manifests. Native install scripts remain disabled until separately reviewed.
- Privacy/cost: no live mail, provider credentials, customer data, private server inventory, external AI, WhatsApp, or paid service used.
- Rollback: revert only this task branch's commits; no migrations, external services, deployment, or server changes exist.
- Commit / PR / remote SHA: W05 foundation commit `01e7dfab90c47ee5e99acbf03d1f1d158c6e2b8f` is pushed on `feat/W05-security-structure`; the branch is tracked at `origin`. PR [#2](https://github.com/millsbrandon/ai-webmail/pull/2) is open and unmerged; GitHub PR head follows the branch.
- Next task: W06 web/worker/database skeleton and migrations, now active on `feat/W06-monorepo-foundation`. W02–W04 remain blocked and optional integrations remain disabled.

## W06 foundation checkpoint — 7 October 2026

- Status: **done**. Core web, worker, and database skeletons are implemented and repeatable local Compose startup and database-role acceptance checks pass.
- Branch: `feat/W06-monorepo-foundation`, based on W05 branch `feat/W05-security-structure`. Commit `df7c5376f084e32d847ccd61750afc588de32063` contains the foundation; final Compose evidence commit is `c23ecff641e4f45ea206ff52caf79ab00b67e002`. Stacked PR [#3](https://github.com/millsbrandon/ai-webmail/pull/3) is open and unmerged; GitHub's head SHA matches the final W06 commit.
- Changed: pinned npm workspaces for Next.js/React, worker, and Drizzle/PostgreSQL; local-only environment templates; loopback-only PostgreSQL Compose definition and separate migrator/runtime roles; app-schema migration and isolated `webmail_test`; database health endpoint; no-mailbox-connected landing page; graceful idle worker; development instructions; dependency inventory and tracker.
- Validation: Node.js 24.21.0; clean `npm ci --ignore-scripts` passed; `npm run lint` passed; `npm run typecheck` passed for web/worker/database; `npm run build` passed; `npm run worker:build` passed; `npm audit` reported 0 vulnerabilities; `npm run db:generate` reported no schema changes after migration generation. Installed the Docker CLI 29.8.2, Compose v2 5.6.0, and Colima 0.10.3; started an Apple Virtualization Framework runtime without restarting the computer and registered Homebrew's Compose plugin in the Docker CLI's existing user configuration. `docker compose --env-file .env.compose config --quiet` passed. A fresh `docker compose --env-file .env.compose up -d --wait` pulled PostgreSQL 18.6, initialized successfully, and passed its health check. The initialization script created both non-superuser roles, two migrator-owned databases, and runtime CONNECT without database CREATE. `npm run db:migrate` applied to both databases; runtime-role probes verified SELECT/INSERT/DELETE and denied DDL in both. `docker compose down` followed by `up -d --wait` recreated a healthy container while preserving both migrated schemas and the named volume. The production server started on loopback and `/api/health` returned HTTP 200 `{"status":"ok"}`; server and worker stopped after checks.
- Dependency/license evidence: direct packages are exact-pinned; installed package SPDX metadata was checked against npm registry. Stable Drizzle ORM/Kit versions were retained; nested esbuild is patched to 0.25.12. Full `npm audit` is clean.
- Privacy/cost: only synthetic/local setup was exercised; no live mail, customer data, credentials, external AI, WhatsApp, paid service, or deployment was used. Generated local `.env*` files remain ignored and must not be committed.
- Secret scan: Gitleaks scanned all 11 reachable commits and the staged W06 changes; no leaks found.
- Acceptance: repeatable local start, least-privileged runtime role, and isolated test database are verified. W07 test and CI work may proceed on its own task branch. Leave W02–W04 blocked and keep live mailbox, AI, and WhatsApp integrations disabled.

## W07 test and CI checkpoint — 7 October 2026

- Status: **done**. Work was limited to automated local tests and free GitHub Actions checks; no application feature or external-service integration was authorized.
- Branch: `feat/W07-tests-ci`, based on completed W06 commit `c23ecff641e4f45ea206ff52caf79ab00b67e002`; implementation commit `1bba8aef2ad246fc8353eb36cb620b651e26548b`, followed by tracker/handoff commit `c2de68162987fe809600a4454fbdf55a24164170`. Stacked PR [#4](https://github.com/millsbrandon/ai-webmail/pull/4) is open and unmerged. Both latest push and pull-request checks passed on `c2de68162987fe809600a4454fbdf55a24164170`; remote branch SHA was verified. Acceptance IDs A01–A15.
- Plan: add unit tests for database configuration and health-route error/configuration behavior, a PostgreSQL-backed integration test using the isolated test database, Chromium end-to-end and axe accessibility checks, and a read-only GitHub Actions workflow that starts the documented Compose database with ephemeral credentials.
- Changed: Node test-runner checks for database schema/connection configuration and health-route missing/unavailable/healthy behavior; Playwright Chromium tests for the disconnected landing page, health endpoint, and axe WCAG 2.2 A/AA/accessibility best-practice violations; root test scripts; read-only GitHub Actions workflow with fresh Compose provisioning and ephemeral credentials; local verification instructions and exact test-tool license/version inventory. The Next workspace launcher now consistently loads the repository-level environment file.
- Validation: clean `npm ci --ignore-scripts` passed; `npm run lint` passed; `npm run typecheck` passed across workspaces; `npm run test` passed (4 unit, 1 isolated-PostgreSQL integration, 3 Chromium e2e/accessibility tests); axe reported zero violations; `npm run build` and `npm run worker:build` passed; `npm audit` reported 0 vulnerabilities. The CI workflow YAML parses. Gitleaks scanned all 16 reachable commits and staged changes with no findings. GitHub Actions push run [#37680423547](https://github.com/millsbrandon/ai-webmail/actions/runs/37680423547) and pull-request run [#37680429451](https://github.com/millsbrandon/ai-webmail/actions/runs/37680429451) both completed successfully on `c2de68162987fe809600a4454fbdf55a24164170`; PR #4 head and the verified remote branch SHA matched that commit. This resolves the earlier paused Chromium-install check.
- Privacy/cost: tests use only the disposable local Compose databases and synthetic settings; CI uses short-lived generated credentials and no paid services. No live mailbox, AI, WhatsApp, or production credentials.
- Rollback: revert only the W07 branch changes; CI does not deploy or modify external services.
- Handoff: Docker/Colima remain installed and running. This project's PostgreSQL service has been stopped with `docker compose --env-file .env.compose down`; its named volume is retained and port 5432 was verified free. W02–W04 remain blocked; do not connect live mail or enable AI/WhatsApp.

## W08 design tokens and component gallery checkpoint — 8 October 2026

- Status: **done**. Owner: project implementation. Acceptance: A10.
- Dependency/gate: W07 and W08 are complete with passing local and CI evidence. G1 was technically reviewed and exited for local G2 implementation under D012; this does not authorize production authentication, live users, or external services.
- Branch: `feat/W08-design-system`, based on verified W07 branch head `c2de68162987fe809600a4454fbdf55a24164170`; implementation commit `417e7552d210e99a8659359796596f095c30d055`; tracker evidence commit `39db9d6b87c3d9ab1d774598b07d50b3f315c551`. Stacked PR [#5](https://github.com/millsbrandon/ai-webmail/pull/5) targets W07 PR #4, is open and unmerged, and the branch remote SHA was verified. Do not merge earlier stacked PRs as a shortcut.
- Changed: replaced page-level color literals with semantic theme, spacing, radius, and focus tokens; added a responsive `/design-system` page with light and dark component examples for default/hover/focus/selected/disabled/loading/error/empty/offline/permission-revoked/stale states; added a typed, named Lucide SVG icon registry pinned to 1.53.0; linked the gallery from the foundation landing page; added CSS-token contrast tests and [the W08 contrast report](./evidence/W08/2026-10-08/contrast-report.md); extended browser tests for gallery accessibility, keyboard focus, and target viewport widths; documented the gallery, updated the dependency/license inventory, and added the Lucide package/lock entry.
- Validation: Node.js 24.21.0 and exact npm 11.16.0. `npm ci --ignore-scripts` passed with 0 vulnerabilities; `npm run lint` and `npm run typecheck` passed; `npm run test` passed (5 unit, 1 isolated-PostgreSQL integration, 5 Chromium end-to-end/accessibility tests); axe reported zero violations on the gallery and landing page; browser page-overflow checks passed at 320, 375, 390, 768, 1024, 1280, 1440, and 1920 CSS pixels; the unit contrast test verified 23 token pairs per theme (minimum text 6.20:1 light / 7.76:1 dark, control boundary 4.55:1 / 6.66:1, focus 6.41:1 / 9.47:1); `npm run build` and `npm run worker:build` passed; `npm audit` reported 0 vulnerabilities. The rendered gallery was visually reviewed. `git diff --check` passed and Gitleaks found no leaks in 18 reachable commits or staged changes. The local PostgreSQL service was stopped without deleting its named volume; port 5432 is free.
- GitHub: push run [#37763722420](https://github.com/millsbrandon/ai-webmail/actions/runs/37763722420) and PR run [#37763727783](https://github.com/millsbrandon/ai-webmail/actions/runs/37763727783) both passed on tracker commit `39db9d6b87c3d9ab1d774598b07d50b3f315c551`; `gh pr view` and `git ls-remote` verified the open PR head and exact remote SHA. PR #5 remains unmerged. G1 technical exit for local G2 work is recorded; deployed authentication remains disabled.
- Privacy/cost: static synthetic examples only. No mailbox data, provider access, AI/WhatsApp service, paid dependency, or deployment.
- Rollback: revert only W08 commits on its task branch; no database or external-service changes are planned.
- Reviewer/gate: implementation, documentation, acceptance evidence, and CI are complete for W08. PR #5 remains open and unmerged for ordinary GitHub review. G1 technical exit for local G2 implementation is recorded above; W02–W04 and all external integration gates remain unchanged.

## W09 invite-only password authentication checkpoint — 8 October 2026

- Status: **done**. Owner: project implementation. Acceptance: W09 password-auth scope under A03; passkeys/recovery continue in W10.
- Dependency/gate: G1 technical evidence review is complete under D012 for local G2 implementation only. This does not authorize deployed authentication, live users/invitations, live mail, or any external integration. G2 remains active on W10; W11–W12 are not started.
- Branch: `feat/W09-password-auth`, based on verified W08 branch head `d1c3976b32b31ee9e120778c3a4ca429705b3af3`; implementation commit `118ef85e3b7f63dc0510e971115a2d2172effef8`.
- Scope: invite-only account model, local invitation issuance/consumption for synthetic development, Argon2id password hashing, generic login failures, minimum-length/byte limits and a local common-password denylist, account cooldown, opaque server-side sessions, CSRF/origin protections, secure cookie behavior, and revocation/logout tests. Trusted-source rate limiting remains a pre-public-exposure hardening gate because the proxy trust boundary is not configured. No public signup or deployed invite dispatch.
- Changed: auth tables and migration; Argon2id password policy and hashing; single-use, expiring invitations; generic login failures and account cooldown; opaque server sessions with idle/absolute expiry and revocation; exact-origin/CSRF checks, Secure `__Host-` cookies and bounded JSON bodies; login/invitation pages; local test-database migration command; synthetic integration and browser tests. CSRF bootstrap requests are deduplicated and reuse an existing valid cookie so React Strict Mode and repeated reads cannot desynchronize the double-submit value.
- Validation: Node.js 24.21.0 and npm 11.16.0. `npm ci --ignore-scripts` passed with 0 vulnerabilities and the bundled Argon2 prebuild loaded; `npm run db:generate` reported no schema changes; `npm run db:migrate:test` applied migrations to `webmail_test` and succeeded when repeated; a negative-path check confirmed that the migration helper refuses the primary `webmail` database. The CI workflow YAML parsed. `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run worker:build`, and `npm audit` passed. `npm run test` passed 9 unit tests, 6 PostgreSQL integration tests, and 6 Chromium end-to-end/accessibility tests. axe reported zero violations on invitation and login pages. `git diff --cached --check` passed; Gitleaks staged and full-history scans found no leaks (24 commits). Full staged source/schema/config/docs diff reviewed.
- Limitations/gates: the denylist is a short local set of common phrases, not a comprehensive breached-password corpus. Source/IP rate limiting is not implemented because no trusted proxy address contract exists; add and verify that control before public exposure. Public invitation issuance/delivery, passkeys/recovery (W10), mailbox memberships (W11), and administrative revocation/audit (W12) are not implemented. Authentication is local synthetic-development only.
- Privacy/cost: synthetic users and `webmail_test` only; no live staff list, production provisioning, external invitation delivery, mailbox, or paid service. Secrets stay in ignored local environment files.
- Rollback: revert only W09 task-branch commits; do not remove database volumes or touch production services.
- GitHub: commit `118ef85e3b7f63dc0510e971115a2d2172effef8` was pushed and remote SHA verified. Stacked PR [#6](https://github.com/millsbrandon/ai-webmail/pull/6) targets `feat/W08-design-system`, remains open/unmerged, and both push and PR CI runs passed ([37767103349](https://github.com/millsbrandon/ai-webmail/actions/runs/37767103349), [37767121657](https://github.com/millsbrandon/ai-webmail/actions/runs/37767121657)). This tracker handoff is a follow-up evidence-only checkpoint.
- Next permitted task: W10 passkeys and recovery on `feat/W10-passkeys-recovery`, stacked on the W09 checkpoint. W02–W04 remain blocked; no deployment or live-user onboarding.

## W10 passkeys and recovery implementation checkpoint — 8 October 2026

- Status: **blocked** as of 10 November 2026. Local implementation and synthetic verification are complete. The hands-on localhost passkey/recovery drill below now passes on one device; the full required platform matrix and production recovery preparation remain unverified. Acceptance: A03.
- Dependency/gate: stacked on the verified W09 branch head `5a9b502d2954a28bab7b878b7d716be9be34a43f`; G2 remains active. This work enables no live accounts, external invitation delivery, mailbox, production hostname, mail, or external integration.
- Scope: session-bound passkey registration and removal, discoverable passkey login, one-use short-lived challenge enforcement, exact-origin/RP-ID and user-handle checks, authenticator counter protection, recent-authentication gating, one-time hashed recovery codes and recovery login, with password login retained as fallback. Private authentication GET routes are dynamic and `no-store`.
- Changed: WebAuthn challenge/credential and recovery-code schema plus migration/backfill; server verification and route handlers; passkey/recovery UI and virtual-authenticator browser coverage; password-fallback and logout synchronization tests; local origin/device-test documentation, threat model, dependency inventory, and design-playbook acceptance notes.
- Validation: Node.js 24.21.0, npm 11.16.0. `npm ci --ignore-scripts` completed earlier in this task with no install scripts; `npm audit` found 0 vulnerabilities. `npm run lint`, `npm run typecheck`, and aggregate `npm run test` passed; tests reported 13 unit, 8 isolated-PostgreSQL integration, and 9 Chromium end-to-end tests passed. Browser coverage includes a virtual WebAuthn registration/sign-in/removal journey and one-use recovery flow, not physical-device support. `npm run build` and `npm run worker:build` passed; `npm run db:generate` reported no schema changes; `npm run db:migrate:test` passed. An isolated synthetic pre-W10 database migration/backfill and runtime-role permission check also passed; no production database was accessed. Full staged diff reviewed; `git diff --cached --check` passed; Gitleaks found no leaks in 26 reachable commits or staged content.
- Limits / remaining evidence: the original implementation checkpoint used virtual authenticators only; the later hands-on drill below supplies one real-device result, not the required iOS/macOS, Android and Windows compatibility matrix. Browser/OS versions and authenticator type were not captured, so no particular platform coverage is inferred from a credential label. Production owner recovery preparation, final production hostname/RP-ID selection, and trusted-source/IP rate limiting remain prerequisites before public exposure. Source/IP limiting is intentionally not claimed as complete without a configured trusted-proxy contract.
- Privacy/cost: synthetic users and isolated test database only; no customer mail, production identity, credential, external service, paid service, or deployment used.
- Rollback: revert only W10 task-branch commits; preserve local database volumes and do not touch production services.
- GitHub checkpoint: commit `7d9a60de81e55e52b3e175b4fa7e356f8ac508ae` is pushed on `feat/W10-passkeys-recovery`; `git ls-remote` matched the exact SHA. Stacked PR [#7](https://github.com/millsbrandon/ai-webmail/pull/7) targets W09 PR #6 and is open/unmerged. Both push and PR CI runs passed ([37770625312](https://github.com/millsbrandon/ai-webmail/actions/runs/37770625312), [37770652185](https://github.com/millsbrandon/ai-webmail/actions/runs/37770652185)).
- Checkpoint state at 8 October: implementation, local checks, scans, remote SHA, and CI are verified. On 10 November W10 moved to blocked for physical-device/recovery-preparation evidence; D014 permits independent synthetic W11 work without claiming W10 or G2 complete.

## W11 mailbox memberships and capabilities — 10 November 2026

- Status: **done**. Owner/reviewer: project implementation / Copilot technical evidence review. Acceptance: W11 synthetic A01/A02 isolation scope only; future mail/search/download/send surfaces remain separate tasks.
- Branch: `feat/W11-mailbox-capabilities`, based on verified W10 checkpoint `552c5fc39512da3ddf496ea9c1d102f558892e7b` (PR #7 remains open/unmerged with passing CI).
- Plan: organization and explicit mailbox memberships with composite tenant constraints; shared deny-by-default role/capability service; session-authenticated, scoped metadata list/detail routes; synthetic Owner/A/B, administrator-without-content, cross-organization and revoked/disabled-member tests.
- Safety: no mailbox connection, credentials, content, invitation delivery, real identities, or deployment. W10's evidence remains blocked; G2 has not exited. An existing untracked duplicate login source is not part of this task and will not be staged or modified.
- Changed: four organization/mailbox tables with role/status checks, uniqueness and composite tenant foreign keys; new `packages/domain` capability/scoped-query service; authenticated no-store metadata list/detail routes; role/flag unit tests, Owner/A/B service/handler integration tests, and an actual HTTP isolation/revocation test. No content permission bypass for organization owners or administrators; no public grant API before audited privileged operations.
- Validation prerequisite: `npm audit` identified newly disclosed critical advisories in the existing Next.js 16.4.0 pin (GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r, GHSA-673q-mjm6-r5xr). Updated only the exact Next.js patch pin to 16.4.6 and its locked packages; registry engines/peers remain compatible. No floating upgrade or install scripts used. This is necessary for the required audit/CI gate.
- Local evidence: Node.js 24.21.0 / exact cached npm 11.16.0. `npm install --package-lock-only --ignore-scripts` and `npm ci --ignore-scripts` passed; `npm audit` reports 0 vulnerabilities. `npm run lint`, `npm run typecheck`, `npm run test:unit` (16 tests), `npm run test:integration` (14 tests), `npm run test:e2e` (10 tests), `npm run build`, and `npm run worker:build` passed. `npm run db:migrate` and `npm run db:migrate:test` passed on local-only databases; `npm run db:generate` reports no schema changes. The compiler initially encountered duplicate generated Next declaration caches; only eight named duplicate ignored cache files were removed, leaving the untracked login source untouched. All later typechecks/builds pass.
- Migration review: the composite mailbox identity is a table-level UNIQUE constraint so it exists before membership foreign keys are added. Fresh W11 application and repeat generation succeeded; foreign-key tests require PostgreSQL 23503 and duplicate membership tests require 23505.
- Checkpoint review: complete code/schema/lockfile/documentation diff reviewed; `git diff --cached --check` passed; `gitleaks git --no-banner --redact --log-opts='--all'` scanned 28 reachable commits with no leaks; `gitleaks protect --staged --no-banner --redact` found no leaks. The unrelated untracked login duplicate is excluded.
- Limits: scoped metadata and policy only; no message objects, sending, streams, search, attachments, AI or membership administration UI is claimed complete. Future surfaces must apply the same tenant/mailbox/capability scope before fetching their own objects. Runtime grants are a service trust boundary, not database row-level security.
- Rollback: revert W11 task commits and disable its read routes; preserve local volumes and do not remove shared database tables or production data as a shortcut.
- GitHub: implementation `c927c9d46fbf98543c9bee0732984c091536f003` pushed with exact remote SHA verified. Stacked PR [#8](https://github.com/millsbrandon/ai-webmail/pull/8) targets W10 PR #7 and remains open/unmerged. Push/PR CI passed ([42904759489](https://github.com/millsbrandon/ai-webmail/actions/runs/42904759489), [42904785779](https://github.com/millsbrandon/ai-webmail/actions/runs/42904785779)). Next permitted local task: W12 under D015.

## W12 session revocation and audit — 10 November 2026

- Status: **done** under D015/D016 after diff review, local validation, secret scans, verified push and both Linux CI runs. Branch `feat/W12-session-audit` starts from W11 evidence checkpoint `766ac0818d1130e14fef1cb53434bdda87f9ccd0`, pushed with exact remote SHA verified.
- Plan: private session list and recent-auth revocation; owner-scoped non-owner account disable with session invalidation; transactional, attributable audit records with runtime-role append-only grants; UI and synthetic tests. Multi-organization account disabling and owner-account recovery remain deliberately unavailable rather than granting one organization control over another.
- Safety: local synthetic data only. No queue/send, real accounts, mailbox connection, external mail, deployment, AI or WhatsApp enablement. W10/G2 remain blocked on their existing evidence gates.
- Changed: session method/device-label fields (legacy method backfilled as unknown), append-only runtime audit migration, atomic audited session lifecycle, self-session list/individual/all-other revocation routes and UI, owner-only scoped non-owner account disable, and audit/final recent-session checks for passkey/recovery mutations. Successful recovery-code sign-in now revokes older sessions, as required by the design.
- Local evidence: Node.js 24.21.0 / npm 11.16.0. `npm run db:migrate`, `npm run db:migrate:test`, and `npm run db:generate` passed (no schema drift). `npm run lint`, `npm run typecheck`, `npm run test:unit` (17 tests), `npm run test:integration` (22 tests), `npm run test:e2e` (11 tests), `npm run build`, `npm run worker:build`, and `npm audit` passed (0 vulnerabilities). Browser session settings have zero automated axe violations and no horizontal page overflow at 320, 375, 390, 768, 1024, 1280, 1440 and 1920 pixels.
- Regression evidence: tests prove session ownership/no token disclosure, exact origin/CSRF/recent-auth rejection, individual/all-other revocation preserving the caller, owner/admin/tenant boundaries, concurrent login/disable serialization, rollback of session plus audit, and audit runtime UPDATE/DELETE denial plus TRUNCATE privilege absence. Browser tests were updated to select exact Sign out actions and wait for completed list refresh rather than the transient busy-disabled button; the final suite passes.
- Checkpoint review: full W12 source/schema/test/documentation diff reviewed. Final `npm run lint`, `npm run typecheck`, aggregate `npm run test` (17 unit, 22 integration, 11 browser/HTTP), `npm run db:generate` (no drift), and `npm audit` (0 vulnerabilities) passed after the responsive assertions. `git diff --cached --check` passed; `gitleaks git --no-banner --redact --log-opts='--all'` found no leaks in 30 reachable commits; `gitleaks protect --staged --no-banner --redact` found no staged leaks. Dependencies are unchanged from W11's verified script-disabled installation.
- Initial remote checkpoint: `a7d1025541b3462b85617510ae37f9a87811556f` pushed and exact remote SHA verified; stacked PR [#9](https://github.com/millsbrandon/ai-webmail/pull/9) targets W11. Both initial CI runs ([42907068921](https://github.com/millsbrandon/ai-webmail/actions/runs/42907068921), [42907092237](https://github.com/millsbrandon/ai-webmail/actions/runs/42907092237)) failed the 320px session-layout assertion on Linux (343px scroll width). W12 remained in review until the correction and passing CI below.
- CI correction: security-panel buttons inherited global `white-space: nowrap`, making long device labels exceed narrow list widths with Linux fonts. Scoped wrapping/max-width rules preserve the normal button style elsewhere. A bounded 77-character synthetic device label reproduced the defect locally (837px scroll width at 320px) before the fix; the unchanged eight-width regression then passed after it. Targeted session E2E, full lint/typecheck/test (17/22/11), web build and worker build all passed again. Diff checks and staged/history Gitleaks passed again (31 reachable commits).
- Verified GitHub checkpoint: correction `38983ddfc0ff6c969c86a6f8d3d80590cc3c7378` pushed and exact remote SHA verified. Both push and PR CI passed ([42907597050](https://github.com/millsbrandon/ai-webmail/actions/runs/42907597050), [42907607381](https://github.com/millsbrandon/ai-webmail/actions/runs/42907607381)), including script-disabled locked install, fresh migrations, audit, lint/typecheck, unit/integration/browser/accessibility tests and web/worker builds. PR #9 remains open/unmerged. This completion record is a follow-up documentation checkpoint.
- Limits: audit covers successful implemented authentication/security mutations, not every future action or failed attempt. No public provisioning, audit export, owner recovery, re-enable/password-change UI, queued sends, production account, or live-data test is claimed. Audit attribution survives deletion; it is not tamper-proof against administrators or malicious runtime inserts. W10 evidence and G2 exit remain blocked.
- Reviewer: Copilot technical evidence review of W12's implemented synthetic A01/A07 scope. Rollback: revert W12 task commits/disable new routes; preserve local volumes and retained audit evidence. Restore grants only through a deliberate reviewed migration, never by giving runtime DDL authority.
- Next ordered task: W13, blocked under D016 rather than started through an unpassed security gate. W10 requires physical-device and real recovery-preparation evidence; W04 requires confirmed mailbox/provider/folder configuration and authorized isolated owned-test scope. Existing virtual-authenticator/synthetic tests do not supply those facts. The unrelated untracked login duplicate remains untouched and excluded.

## W10 device-test preparation follow-up — 10 November 2026

- Status: supporting invitation usability fix verified locally; W10 remains blocked, with no physical-device result claimed. Branch `fix/W10-invitation-feedback` is based on W12 evidence checkpoint `375cddf0fd5777041c62e639cbf1f70bdbb8c81a`.
- During hands-on synthetic-account setup, repeated invitation rejection did not consume the invitations or create the account. No submitted password was inspected. Existing generic feedback conflated password/name policy failures with invalid invitations; the exact user's rejected field is not established.
- Changed: invitation acceptance reports password/display-name policy failures independently of invitation validity, while invalid/expired/used/wrong-email invitations retain one non-disclosing response. The form clarifies that the application password is separate from mailbox credentials. Integration coverage checks identical password-policy feedback for valid/invalid tokens and successful subsequent redemption; browser coverage verifies a short-password error followed by successful redemption, login and logout.
- Validation: `npm run lint`, `npm run typecheck`, `npm run test:integration` (22 tests), targeted `npm run test:e2e --workspace @ai-webmail/web -- e2e/auth.spec.ts` (1 test including axe checks), `npm run build`, and `git diff --check` passed. The manual server was temporarily stopped to allow the isolated browser-test server to acquire Next's development lock. No dependency/schema change or live mailbox access occurred.
- Checkpoint: full source/test/docs diff reviewed; `git diff --cached --check`, `gitleaks git --no-banner --redact --log-opts='--all'`, and `gitleaks protect --staged --no-banner --redact` passed. Fix `ff0d5084bbe298213d2db41d727352c160639149` pushed with exact remote SHA verified. Stacked PR [#10](https://github.com/millsbrandon/ai-webmail/pull/10) targets W12; both CI runs passed ([42911480493](https://github.com/millsbrandon/ai-webmail/actions/runs/42911480493), [42911508921](https://github.com/millsbrandon/ai-webmail/actions/runs/42911508921)), including all 17 unit, 22 integration and 11 browser tests plus builds. The loopback manual app is restored and its health/page responses verified; a fresh dummy invitation is open in the user's regular browser. No user password or recovery code was inspected. Rollback: revert this focused fix; preserve synthetic accounts/audit history. Real-device/recovery testing still requires the user's interaction.

## W10 hands-on localhost passkey/recovery drill — 10 November 2026

- Result: one user-operated device completed registration and passkey sign-in for a synthetic local application account. Server metadata confirmed credential creation at 22:13:37 UTC, successful use and a passkey-authenticated session at 22:15:07 UTC. No virtual authenticator was configured for this manual browser flow.
- Recovery: the user generated and privately saved recovery codes, then completed recovery-code sign-in. Server metadata confirmed a recovery-authenticated session at 22:16:03 UTC and exactly one used code. At 22:17 UTC the user explicitly reported that reuse of that code was rejected. Rejection is user-reported browser evidence; no code value/hash, password, private key or biometric material was inspected to verify it.
- Scope/limits: localhost with synthetic data only. Browser/OS versions and authenticator type are not established; credential names are not evidence of platform compatibility. Returning to passkey sign-in after the rejected replay has not yet been confirmed. This is not a production owner recovery-destination drill and does not satisfy the remaining platform matrix or exit G2. No live mailbox connection, external mail, production configuration or integration was enabled.
- Evidence handling: only sanitized timing/outcome summaries are public. No account identifier, device label, credential material or recovery code is included here. Existing automated replay/origin/challenge and recovery tests remain separate evidence. W10 stays blocked on the remaining written acceptance requirements rather than claiming the entire task passed.

## W14 durable synthetic scheduler — 10 November 2026

- Status: **done** after review, local tests/builds/migrations, secret scans, verified push and both Linux CI runs. Owner/reviewer: implementation / Copilot technical evidence review of W14's infrastructure-only A04 scope. Branch `feat/W14-durable-scheduler` is based on verified manual-drill checkpoint `f850c2c13dd838cf8e3f76a5de147e36a42e737e`; both prior-head CI runs passed. D017 permits this independent task without exiting G2 or connecting a provider.
- Changed: `poll_jobs` schema/migration with tenant/mailbox foreign key, unique recurring job identity, durable due time, bounded attempt/error/state/lease constraints; shared transactional enqueue, SKIP LOCKED claim, token-fenced completion/failure, five-attempt retries with backoff/jitter and crash recovery. Worker processes one synthetic empty job at a time, scans once per second, and reschedules 60 seconds after success. No auto-enrollment, public enqueue/retry endpoint, real sync, AI or send adapter is registered.
- Build/dependency decision: shared workspaces expose TypeScript source. The worker now typechecks with bundler resolution and bundles first-party modules into runnable ESM, leaving pg/Drizzle external. Exact esbuild 0.28.2 (MIT, Node >=18) was already present transitively through tsx and is now a direct worker dev dependency. Its declared postinstall remains disabled; `npm install --package-lock-only --ignore-scripts` and `npm ci --ignore-scripts` passed and the bundled platform executable worked without running scripts. Lockfile additions are this direct tool and its optional platform packages; no broad dependency upgrade.
- Validation: Node 24.21.0 / npm 11.16.0. `npm run db:migrate`, `npm run db:migrate:test`, `npm run db:generate` (no drift), `npm run lint`, `npm run typecheck`, `npm run test` (17 unit, 30 integration, 11 Chromium/HTTP/accessibility), `npm run build`, `npm run worker:build`, `npm audit` (0 vulnerabilities), and `git diff --check` passed. A standalone bundled-JavaScript worker smoke test consumed a synthetic test-database job and exited cleanly on SIGTERM, without a TypeScript loader. A diagnostic `npm ls esbuild` reports the existing Drizzle loader override as invalid against its old declared range; this pre-existing override is documented in the inventory, unchanged, and audit/build/migration checks pass.
- Exact queue evidence: eight PostgreSQL tests verify enqueue deduplication and rollback; 120 timestamp-driven empty cycles with zero fetch requests and one durable row; no early claim before each 60-second boundary; eight competing claimers; SKIP LOCKED progress past a held row; new-connection lease recovery; expired/replaced completion and failure rejection; bounded jitter/backoff and terminal failure after five processor failures or crashes; disabled mailbox suppression; PostgreSQL 23503 for cross-tenant identity; and actual worker-process restart/shutdown. The 120 cycles represent logical time, not two elapsed hours or real provider polling.
- Limits: only empty synthetic polls are supported. Queue fencing protects database updates, not exactly-once external I/O; provider processors require lease renewal/cancellation, idempotency, scoped service principals and final authorization checks before integration. No production recovery preparation, physical-platform matrix, live-mail access, external sends or integration gate is claimed passed.
- Safety/rollback: synthetic local fixtures only, cleaned up by exact IDs; no provider credentials or personal manual-test data included. Revert W14 commits/stop the worker to disable this infrastructure; preserve database volumes and do not drop shared tables as a rollback shortcut. The unrelated untracked login duplicate remains untouched.
- Checkpoint review: full first-party source, tests, migration/schema, build configuration, lockfile and documentation changes reviewed. `git diff --cached --check` passed; `gitleaks git --no-banner --redact --log-opts='--all'` scanned 40 reachable commits without leaks; `gitleaks protect --staged --no-banner --redact` found no staged leaks. Final targeted queue tests, lint/typecheck and worker build passed after routing the 120-cycle test through the actual worker-cycle function. The user's loopback web app was restored after aggregate tests.
- GitHub: implementation `1e9d2aa6f39bbbeee5998882a7fedd1c244bea44` pushed and exact remote SHA verified. Stacked PR [#11](https://github.com/millsbrandon/ai-webmail/pull/11) targets invitation-fix PR #10 and remains open/unmerged. Both push and PR CI passed ([42914494596](https://github.com/millsbrandon/ai-webmail/actions/runs/42914494596), [42914524768](https://github.com/millsbrandon/ai-webmail/actions/runs/42914524768)), including script-disabled locked install, fresh migrations, all 58 tests, audit and both builds. This completion record is a follow-up documentation checkpoint.
- Next ordered unresolved implementation is W13; W15's import/reconciliation depends on the still-unimplemented provider/folder contracts. D017 does not authorize either connection/import or a G2 exit. Remaining physical-platform/recovery preparation and W04 production configuration are recorded honestly; no mailbox credential, identity or test-account secret is published in this tracker.

## W13 disconnected setup preparation — 10 November 2026

- Status: **local preview verified**, not full W13 completion. Branch `feat/W13-offline-mailbox-setup` starts from verified W14 head `0f78bb45a501657e3813971f16c617bb9643dc5d`. D018 authorizes only this disconnected portion. Overall completion remains 9/40; G2 and provider connection gates remain open.
- Changed: owner-scoped no-store setup catalog and bounded preview API; shared metadata/history and strict selectable-folder mapping validation/suggestions; accessible three-step setup UI linked from authenticated security settings. Preview accepts .test addresses only, no provider endpoints/credentials, creates no mailbox or jobs, and explicitly reports providerVerified/persisted/sendingEnabled false.
- Authorization: authenticated catalog lists only owned organizations; POST enforces origin, session CSRF, five-minute freshness, active account and transactional locked owner membership. Members, administrators, cross-tenant/guessed organizations and revoked owners cannot preview. No content-membership bypass, public provisioning or automatic organization creation is introduced.
- Related fix: browser coverage found that client navigation after sign-in reused the cached pre-authentication CSRF bootstrap token. Successful password/passkey/recovery sign-in now clears that cache at the rotation boundary; subsequent navigation re-reads the current cookie through the existing CSRF endpoint. Server verification remains unchanged. The new browser journey reproduces that boundary using real password login rather than cookie injection.
- Validation: Node 24.21.0 / npm 11.16.0. `npm run lint`, `npm run typecheck`, `npm run test` (21 unit, 34 PostgreSQL integration, 13 browser/HTTP), `npm run build`, `npm run worker:build`, `npm run db:generate` (no drift), `npm audit` (0 vulnerabilities), and `git diff --check` passed. No dependency or schema change requires installation/migration. Browser coverage verifies mapping correction, review/edit, keyboard focus, axe checks, all three steps at 320/375/390/768/1024/1280/1440/1920px without horizontal page overflow, and zero external browser requests. API tests verify that no mailbox or queued job is created, body bounds, secret-field rejection without echo, and immediate revocation/disabled-account rejection.
- Limits/rollback: fixtures are not provider-discovered folders; no TLS, DNS, authentication, masked credential storage, live test-mailbox verification or sending is claimed. Revert this focused task branch to remove the preview and navigation; no schema or persisted preview data exists to roll back. The unrelated untracked login duplicate remains untouched.
- Checkpoint review: full source/test/styles/export/documentation diff reviewed. `git diff --cached --check` passed; `gitleaks git --no-banner --redact --log-opts='--all'` scanned 43 reachable commits with no leaks; `gitleaks protect --staged --no-banner --redact` found no staged leaks. Only exports/test scripts changed in manifests; dependency pins/lockfile are unchanged.
- Remote: implementation checkpoint `a318a6593dfb3e26283c8beda716c3edaf071192` pushed and exact remote SHA verified. Stacked PR [#12](https://github.com/millsbrandon/ai-webmail/pull/12) targets W14. Both Linux CI runs passed: [push](https://github.com/millsbrandon/ai-webmail/actions/runs/42918059229) and [PR](https://github.com/millsbrandon/ai-webmail/actions/runs/42918068485), each including pinned dependency installation, isolated migrations, audit, lint, typecheck, unit/integration/browser tests and both builds. Local localhost:3000 app restored; `/api/health` returned status ok and `/mailbox-setup` HTTP 200. This is a local disconnected preview, not production authentication or live-mail acceptance.

## W15 fixture reconciliation preparation — 10 November 2026

- Status: **local fixture core verified**, not full W15 completion. Branch `feat/W15-synthetic-reconciliation` starts from W13 evidence checkpoint `98eab59f04e6ed3b1cfb4adced0360b8e8a03e7c`, whose [push](https://github.com/millsbrandon/ai-webmail/actions/runs/42918447557) and [PR](https://github.com/millsbrandon/ai-webmail/actions/runs/42918455601) Linux CI both passed. D019 authorizes only this isolated preparation; W15 remains blocked and total stays 9/40.
- Changed: `packages/domain/src/mail-reconciliation.ts`, its synthetic unit fixtures and package export/test script; development/threat-model documentation and this tracker. The pure planner compares bounded complete inventories, preserves omitted folders, returns a fresh snapshot and local insert/update/remove references, and rejects scope mismatch, incomplete/duplicate/oversized inventories, UIDNEXT regression and immutable stable-UID content changes. It imports no runtime modules and is not wired into any worker or web route.
- A05/A15 preparation: identity uses exact mailbox/folder/UIDVALIDITY/UID, never Message-ID deduplication. Initial imports, resets, late UIDs, known/copied content, ambiguous fingerprints and missing hashes stay suppressed; classifications are sticky after flag updates/hash enrichment. Unique disappeared-source/destination hash+size pairs yield cautious same-mailbox move hints, not message merges or provider commands. A new candidate is not authorization or eligibility for any automated action.
- Local validation: Node 24.21.0 / npm 11.16.0. Repository formatter, `npm run lint` (96 files), `npm run typecheck`, `npm run test:unit` (32 tests: 12 web, 2 database, 18 domain), `npm run worker:build`, and `git diff --check` passed. Eleven new fixture cases cover initial/repeat inventory, flags, duplicate/missing IDs, UID reset, unique moves/copies/ambiguous sources, hash/size distinction, historical suppression, omitted folders, scope mismatch, incomplete/regressed inventories, bounds, immutable UID content and input/output independence. Initial formatting invocation and inferred readonly Map-value type failed during development; the correct formatter invocation and explicit typed Map resolve both. No dependency/schema change, install or migration is needed. Full integration/browser/web-build checks will be recorded from checkpoint CI rather than represented as rerun locally for this pure-function change.
- Remaining/rollback: no network import, pagination, folder deletion/rename discovery, stored customer metadata/body, durable cursor, transactional persistence, lease fencing or failure/restart guarantee is implemented here. W13/provider acceptance and the remaining W15 persistence/adapter evidence are prerequisites to enabling sync. Revert this focused task to remove the unused export/planner/tests; no schema or persisted data is affected.
- Checkpoint review: source, fixtures, manifest and documentation changes reviewed against the D019 contract; unchanged integration/browser surfaces remain covered by CI. Missing incoming fingerprints now preserve a stable UID's known hash instead of forcing body refetch; the fixture proves this produces no spurious update. Final `npm run lint`, domain typecheck/unit (18 tests) and `git diff --cached --check` passed. History Gitleaks scanned 45 reachable commits and staged Gitleaks scanned this six-file scope; both found no leaks. No adapter, route, worker, dependency pin, lockfile or database change is included. This is a preparation review, not G3 exit.
- Remote: implementation checkpoint `fe8e79ac61698004277e27f4dfc6997ac3b3c5b2` pushed with exact remote SHA verified. Stacked PR [#13](https://github.com/millsbrandon/ai-webmail/pull/13) targets W13. Both Linux CI runs passed: [push](https://github.com/millsbrandon/ai-webmail/actions/runs/42919160584) and [PR](https://github.com/millsbrandon/ai-webmail/actions/runs/42919166595). Exact CI totals: 32 unit, 34 PostgreSQL integration, 13 browser/HTTP = **79 tests**, plus locked install, isolated migrations, zero-vulnerability audit, lint, typecheck and web/worker builds. Local application remains healthy. No live mailbox credential, connection, content, external send or gated integration was used.

## Requirement traceability

| Requirement | Primary tasks | Acceptance |
|---|---|---|
| Shared inbox ACL / fixed mailbox From | W11,W12,W18,W21,W24 | A01,A02,A07 |
| Independent accounts/password/passkeys/recovery | W09,W10,W12,W33 | A03 |
| Minute code polling / robust sync | W13–W16 | A04,A05,A15 |
| Familiar fast responsive webmail | W08,W17–W20,W33,W34 | A10,A11 |
| Sources/history/AI drafts | W25–W28 | A08,A13 |
| Safe reviewed sending | W19,W21–W24 | A06,A07 |
| Spam/acknowledgement/rules | W29,W30 | A09 |
| WhatsApp privacy/review | W03,W31,W32 | A14 |
| Open-source/no extra spend | W01–W03,W05,W26,W36 | A13,A14 |
| Safe migration/restore | W35,W37–W40 | A12 |

## Deferred backlog (not part of 40-task completion count)
Calendar scheduling; CRM integrations; advanced document extraction; live collaborative editing; external API/MCP; email tracking; native apps; offline encrypted mailbox cache; enterprise SSO. Basic contacts and operational analytics follow core qualification under separately estimated tasks. No unbounded AI autocomplete by default. Record priority and measurable user need before adding.

## Release owner checklist
[ ] Per-mailbox access reviewed with actual staff.
[ ] Personal recovery/passkeys tested on real devices.
[ ] Internal author and shared From demonstrated.
[ ] AI route and usage stop demonstrated without paid fallback.
[ ] WhatsApp verified or explicitly declared unavailable/deferred.
[ ] Auto-responses off until exact policy approved.
[ ] HTML/attachments/search/AI cannot cross permissions.
[ ] Mobile keyboard, desktop, dark theme and accessibility tested.
[ ] Performance measured, not inferred.
[ ] Off-host backup restored; rollback tested.
[ ] FreeScout cutover authorized and pending sends reconciled.
[ ] Operational owner, alerts and maintenance schedule assigned.
