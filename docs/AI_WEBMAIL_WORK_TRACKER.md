# AI Webmail — Gated Work Tracker
Version 1.0 • 7 October 2026

Companion: AI_WEBMAIL_DESIGN_PLAYBOOK.md. Product: standalone open-source codebase; NO OpenClaw runtime.

## Current truth
Implementation completed: **3 / 40 tasks**. No implementation or release task is marked complete merely because its design exists. W01, W05, and W06 are done; W07 is the single active implementation task. G0 is exited for foundation work with W02–W04 explicitly blocked; AI, WhatsApp, and real mailbox integration stay disabled.

Documentation deliverables: design playbook and this tracker authored; document checks are separate from implementation progress.

## Mandatory work protocol
States: todo → in_progress → review → done; or blocked. Only one task in_progress. Dependencies follow listed order unless a recorded owner-approved decision explicitly allows independent work. Phase exit requires all mandatory tasks done and gate sign-off. Blocked tasks are not done; optional features can be deferred only by named scope decision, remain tracked, and must be disabled in release. Never cross a security/send gate just to keep busy.

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
Gate status: IN PROGRESS. Reviewer/date: —

| ID | Task | Status | Required completion evidence | Acceptance |
|---|---|---|---|---|
| W05 | Add code structure, threat model, dependency/license inventory to bootstrapped repo | done | Pinned lockfile, secret scan, architecture decision record; task branch pushed | A01 |
| W06 | Set up web/worker/database skeleton and migrations | done | Repeatable local start; least-privileged DB roles; isolated test DB | A04 |
| W07 | Set up tests and CI | in_progress | Typecheck, lint, unit/integration/e2e/accessibility checks run | A01–A15 |
| W08 | Implement design tokens and component gallery | todo | All states, both themes, icon registry, contrast report | A10 |

Exit: task evidence reviewed; failures resolved or explicitly blocking. Gate signature and release impact recorded before next phase.

## G2 — Authentication and isolation
Entry: G1 verified.
Gate status: NOT STARTED. Reviewer/date: —

| ID | Task | Status | Required completion evidence | Acceptance |
|---|---|---|---|---|
| W09 | Implement invite-only users and password auth | todo | Hash/cooldown/session/CSRF tests; no enumeration | A03 |
| W10 | Implement passkeys and recovery | todo | Real-device passkey evidence, challenge replay/origin tests, recovery drill | A03 |
| W11 | Implement mailbox memberships and capability service | todo | Owner/A/B fixture passes direct API and object access tests | A01,A02 |
| W12 | Implement session revocation and audit | todo | Immediate disabled-user rejection, privileged reauth, attributable events | A01,A07 |

Exit: task evidence reviewed; failures resolved or explicitly blocking. Gate signature and release impact recorded before next phase.

## G3 — Mail storage and code-only sync
Entry: G2 security gate reviewed before real mailbox connection.
Gate status: NOT STARTED. Reviewer/date: —

| ID | Task | Status | Required completion evidence | Acceptance |
|---|---|---|---|---|
| W13 | Build mailbox connection wizard and folder mapping | todo | TLS validation, masked credentials and isolated owned test mailbox | A05 |
| W14 | Implement durable queue/scheduler and leases | todo | 120 empty cycles, restarts, retries and no AI requests | A04 |
| W15 | Implement incremental import and reconciliation | todo | UID reset, moves, duplicate/missing IDs and historical suppression fixtures | A05,A15 |
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

- Status: **in progress**. Work is limited to automated local tests and free GitHub Actions checks; no application feature or external-service integration is authorized.
- Branch: `feat/W07-tests-ci`, based on the completed W06 branch. Acceptance IDs A01–A15.
- Plan: add unit tests for database configuration and health-route error/configuration behavior, a PostgreSQL-backed integration test using the isolated test database, Chromium end-to-end and axe accessibility checks, and a read-only GitHub Actions workflow that starts the documented Compose database with ephemeral credentials.
- Changed: Node test-runner checks for database schema/connection configuration and health-route missing/unavailable/healthy behavior; Playwright Chromium tests for the disconnected landing page, health endpoint, and axe WCAG 2.2 A/AA/accessibility best-practice violations; root test scripts; read-only GitHub Actions workflow with fresh Compose provisioning and ephemeral credentials; local verification instructions and exact test-tool license/version inventory. The Next workspace launcher now consistently loads the repository-level environment file.
- Validation: clean `npm ci --ignore-scripts` passed; `npm run lint` passed; `npm run typecheck` passed across workspaces; `npm run test` passed (4 unit, 1 isolated-PostgreSQL integration, 3 Chromium e2e/accessibility tests); axe reported zero violations; `npm run build` and `npm run worker:build` passed; `npm audit` reported 0 vulnerabilities. The CI workflow YAML parses. Gitleaks scanned all 15 reachable commits and staged changes with no findings. Remote GitHub Actions validation and final remote SHA verification remain before marking W07 complete.
- Privacy/cost: tests use only the disposable local Compose databases and synthetic settings; CI uses short-lived generated credentials and no paid services. No live mailbox, AI, WhatsApp, or production credentials.
- Rollback: revert only the W07 branch changes; CI does not deploy or modify external services.

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
