# AI Webmail — Gated Work Tracker
Version 1.0 • 7 October 2026

Companion: AI_WEBMAIL_DESIGN_PLAYBOOK.md. Product: standalone open-source codebase; NO OpenClaw runtime.

## Current truth
Implementation completed: **0 / 40 tasks**. No implementation or release task is marked complete merely because its design exists. Current state: W01 is blocked after local bootstrap. Repository destination and AGPL-3.0 license are approved; GitHub CLI authentication, remote creation, push and remote SHA verification are pending. WhatsApp and AI subscription feasibility remain unverified for the new app.

Documentation deliverables: design playbook and this tracker authored; document checks are separate from implementation progress.

## Mandatory work protocol
States: todo → in_progress → review → done; or blocked. Only one task in_progress. Dependencies follow listed order unless a recorded owner-approved decision explicitly allows independent work. Phase exit requires all mandatory tasks done and gate sign-off. Blocked tasks are not done; optional features can be deferred only by named scope decision, remain tracked, and must be disabled in release. Never cross a security/send gate just to keep busy.

Before task: confirm dependencies, owner, acceptance IDs, branch/commit and test plan. After: record changed files, test commands/results, evidence paths, risks, rollback and reviewer. No evidence means not done. Capture actual completion counts, not estimates. Update this file with each meaningful transition and keep a commit history.

## G0 — Design and feasibility
Entry: No feature implementation until baseline reviewed.
Gate status: NOT STARTED. Reviewer/date: —

| ID | Task | Status | Required completion evidence | Acceptance |
|---|---|---|---|---|
| W01 | Approve baseline/name/license; bootstrap dedicated local and GitHub repository | blocked | Approved GitHub owner/name/license; sanitized docs baseline committed and pushed; remote SHA verified | A01–A15 |
| W02 | Prove supported subscription route without paid fallback | blocked | Official terms/auth flow documented; test request and quota-stop behavior evidenced | A13 |
| W03 | Assess WhatsApp group route and privacy | blocked | Supported route, fees and risks documented; blocked if zero-cost path unproved | A14 |
| W04 | Confirm mailbox/provider, users, sources and retention | blocked | Endpoint/folder sheet, membership matrix and approved FAQ list signed off | A01,A02 |

Exit: task evidence reviewed; failures resolved or explicitly blocking. Gate signature and release impact recorded before next phase.

## G1 — Repository and environment
Entry: G0 baseline approved; unresolved integrations stay disabled.
Gate status: NOT STARTED. Reviewer/date: —

| ID | Task | Status | Required completion evidence | Acceptance |
|---|---|---|---|---|
| W05 | Add code structure, threat model, dependency/license inventory to bootstrapped repo | todo | Pinned lockfile, secret scan, architecture decision record; task branch pushed | A01 |
| W06 | Set up web/worker/database skeleton and migrations | todo | Repeatable local start; least-privileged DB roles; isolated test DB | A04 |
| W07 | Set up tests and CI | todo | Typecheck, lint, unit/integration/e2e/accessibility checks run | A01–A15 |
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

## W02/W03 independent feasibility research — 7 October 2026

Research was done from official public documentation while W01 remote setup is blocked. It does not complete either task: no live account eligibility, owner acceptance, integration test, or cost authorization has been obtained.

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

## W01 local bootstrap checkpoint — 7 October 2026

- Status: **blocked**; GitHub authorization has not completed, so no remote was created or pushed.
- Approved destination: `millsbrandon/ai-webmail`; project name: AI Webmail; license: AGPL-3.0-only.
- Local baseline: standalone Git repository on `main`; sanitized design documents, license, README, `.gitignore`, `AGENTS.md`, and `.github/copilot-instructions.md`. Local commit: `d5db2add8e20a013bb08ca172b24a607b79f5f3a`.
- Validation: `git diff --cached --check` passed. A targeted scan found no original business domain, server IPs, private key path, private-key header, GitHub token pattern, or AWS access-key pattern. `gitleaks` is not installed. No application tests apply; no application code exists.
- Privacy/cost: synthetic/public examples only; no credentials, customer mail, private deployment inventory, or paid services added. AI and WhatsApp remain blocked pending eligibility and cost proof.
- Rollback: no remote or live-system changes have occurred; any correction should be made as a normal follow-up commit.
- GitHub branch / commit / PR / remote SHA: pending authentication and remote creation. W01 is not done until push and remote SHA are verified.
- Next permitted action: complete GitHub CLI authentication, create the approved repository, push this baseline, verify the remote SHA, and review G0 before selecting W02.

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
