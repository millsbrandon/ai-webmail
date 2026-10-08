# Standalone AI Webmail — Design and Implementation Playbook
Version 1.0 • 7 October 2026 • Status: target-state design; implementation evidence is tracked separately; no production deployment

## 1. Product contract
Build an open-source, private, self-hosted webmail application with a fast Next.js interface. No OpenClaw dependency, runtime, scheduler, authentication, or messaging bridge in the delivered system. Reuse maintained open-source protocol/security libraries rather than implement cryptography, MIME, IMAP or SMTP from scratch. Existing mailbox hosting and MX records remain unchanged. Source can be public; customer messages, credentials, user records, backups and deployment configuration must never be public.

Requirements: multiple shared inboxes; independent user accounts; password and passkey login; per-mailbox access; internal attribution; code-only checks every 60 seconds; research-backed AI drafts; configurable safe acknowledgements; WhatsApp alerts/review subject to integration feasibility; no new paid subscriptions, API billing, automatic credit purchases or paid fallback.

This document specifies targets, not achieved guarantees. A compatible ChatGPT subscription route must be proved for this exact application and deployment before enabling AI. Publishing source alone does not prove eligibility. A zero-extra-cost, reliable WhatsApp group integration is also an unresolved dependency, not a promised capability.

### Scope and build tiers
Foundation: login, mailbox permissions, IMAP sync, threading, compose/send, attachments, search, drafts, labels, audit, responsive UI, backups.
First usable AI release: FAQ/prior-reply retrieval, evidence panel, summaries, drafting/rewrite/translation, human approval, templates, spam controls, rule previews, usage hard stop.
Next: WhatsApp integration, assignments, internal notes, collision warnings, snooze/follow-ups, optional acknowledgements, basic analytics.
Later: calendar/CRM, advanced attachment extraction, external API/MCP, SSO, broad omnichannel, native apps and live co-editing. No need to match every competitor or offer their enterprise certifications.

## 2. Architecture and resource envelope
Recommended initial stack: TypeScript, supported stable Next.js App Router + React, Node LTS, PostgreSQL, Drizzle migrations, Zod validation, ImapFlow, MailParser, Nodemailer, maintained server-side HTML sanitizer, SimpleWebAuthn, Argon2id, Lucide React icons, accessible Radix primitives, CSS variables/CSS modules. Tiptap is a candidate lazy-loaded rich editor; start plain text if its payload exceeds budget. Select and pin supported versions during foundation work after checking release/security/license status. No automatic unpinned latest upgrades.

Existing alternatives considered: Roundcube/SnappyMail provide maintained webmail but do not meet the expressly requested custom Next.js product. Missive/Front/etc. supply feature inspiration, not runtime dependencies. A new application still has ongoing maintenance and security responsibilities despite zero license fees.

### Deployment topology
Browser → HTTPS Nginx → loopback Next.js web service → PostgreSQL and private attachment store.
Separate Node worker → IMAP/SMTP providers, approved FAQ hosts, optional AI adapter, optional WhatsApp adapter.
Nginx serves hashed static assets; only 80/443 public for app, restricted SSH for administration. Database, worker and Node ports never public. No Redis, vector database, Kubernetes, hosted analytics or paid queue service in v1.

Use a PostgreSQL-backed job queue with transactional enqueue, unique job keys, bounded leases, retries, failure states and SKIP LOCKED claiming. Queue workers and web routes share typed domain services; UI never has mailbox passwords or provider tokens. One worker process initially, one concurrent AI job, bounded mail connections. Non-AI sync must continue if AI stalls.

Server reference from prior inspection: 1 vCPU, ~2 GB RAM, ~36 GB disk free; remeasure before deployment. Target combined steady RSS under 1.4 GB with at least 300 MB available; tune connection pool to 5 per process and mail connections initially 2 globally. Stress-test rather than assume these fit. Build production artifacts on a compatible Linux x64 build environment, not during normal mail service on the small VM. Avoid simultaneous Next builds and mailbox import. Swap is emergency protection, not a capacity plan. If resources fail, reduce concurrency/features; do not purchase upgrades without authorization. PostgreSQL preferred over SQLite for concurrent queue/web transactions, row locking, search and future team growth; overhead is a measurable trade-off. Pause and record an architecture decision if the host cannot sustain it.

### Repository structure
apps/web: routes, layouts, components and server request handlers.
apps/worker: sync, scheduling, queue consumption, retention and integration jobs.
packages/domain: permission checks, mail operations, draft/send state machines.
packages/db: schema, migration scripts, repositories and seeded test data.
packages/ui: tokens, primitives, icons, component examples.
packages/integrations: mail, AI, knowledge and notification adapters.
packages/contracts: validated request/job/event schemas.
tests: unit, integration, e2e, accessibility, visual, security and load fixtures.
docs: this playbook, work tracker, decisions, threat model, operations and evidence.
ops: example Nginx/systemd files, backup/restore scripts; placeholders only, no secrets.

Do not create microservices per feature. Keep provider adapters separate so unsupported AI or WhatsApp can be disabled without disabling mail.

## 3. Identity, shared inboxes and authorization
A user is a person; a mailbox is a provider account. They are separate records. Never share application logins or disclose mailbox passwords to members.

### Required example
Owner A: info@example.com + manager@example.com.
Teammate A: info@example.com only.
Teammate B: info@example.com + manager@example.com.
A sees no manager mailbox, counts, recipients, searches, attachments, AI evidence, notification previews or activity. B and Owner A can reply to both. Replies to info use info as From and its approved SMTP identity, not the staff login address. Internally record authored_by, approved_by, sent_by and delivery timestamps. Sender signature may identify the staff member only if mailbox policy explicitly enables it.

Organization roles: owner, administrator, member. Owner manages owners, all mailbox access, exports and high-risk settings. Administrator manages assigned administration functions; no automatic mail-content access. Member gets mailbox capabilities only. Owner content access is explicit and disclosed; owner is provisioned as member of all mailboxes, with audited ability to grant access. Never silently let general administrators read every mailbox.

Per-mailbox roles:
- Viewer: read/search messages and permitted attachments. No edits, send, export, notes or AI requests.
- Responder: read, compose, edit own/team drafts under locking, send reviewed manual mail, permitted labels/notes/assignment and request AI.
- Manager: responder plus mailbox templates, rules and authorized approval of AI drafts.
- Access grants and credential changes: owner or specifically authorized administrator; mailbox manager alone cannot add users.
Additional explicit flags: approve_ai, export, delete, manage_rules; avoid role-name assumptions. Default AI approval belongs to managers; owner can grant responders approve_ai. Auto-send configuration is owner-only.

All reads and writes enforce organization + mailbox + capability in server services, not only navigation. Scope database queries before results are fetched; fail closed on missing membership. Search snippets/counts, downloads, SSR payloads, SSE streams, exports, source previews and AI retrieval use the same checks. Return non-disclosing errors for inaccessible IDs. Opaque IDs are not authorization. Integration jobs run with a narrowly scoped service principal, not owner cookies. Recheck rights immediately before send or notification. Revoke streams and invalidate cached permissions on membership change. Application caches must include user + permission version; no shared private CDN caching.

Mailbox setup wizard: display name/address → IMAP host/port/TLS → SMTP host/port/TLS → test both → map INBOX/Sent/Drafts/Junk/Trash → choose initial history window → add members/roles → review. Provider endpoints require explicit admin configuration; block loopback, metadata and unintended private targets to prevent SSRF. Permit private mail servers only via deliberate operator allowlist. Never disable TLS validation to make tests pass. Mailbox connection status visible without exposing credentials.

## 4. Authentication specification
Invite-only accounts. Login page: 400px max-width card, brand heading, primary “Sign in with a passkey”, separator “or”, Email or username field, Password field with reveal control, Sign in, Forgot password. No mailbox-password login. Generic invalid-credential messages. Password-manager autocomplete supported, paste allowed, no cognitive puzzles.

Passwords: minimum 15 characters for password-only login, accept at least 64 (set maximum 128 characters with safe byte handling), breached/common-password rejection using a local list; no forced rotation or arbitrary composition rules. Argon2id hashes with unique salt and library-managed parameters; baseline OWASP floor 19 MiB, t=2, p=1, then benchmark 100–300 ms and memory/concurrency on host. Rate-limit by account and source without easy permanent lockout; shared store, gradual cooldown and auditable recovery.

Sessions: random opaque server-side sessions, Secure/HttpOnly/SameSite=Lax __Host- cookie with Path=/ and no Domain. Rotate on login, reset and elevation. 12-hour idle, 7-day absolute default; owner-configurable bounds. CSRF protection + origin checks for mutations, including JSON endpoints; never trust GET for state change. Session list with device/time and revoke buttons. Password change/recovery and account disable revoke all sessions.

Passkeys: SimpleWebAuthn registration/assertion verification; RP ID mail.example.com and exact HTTPS origin after hostname confirmation. Separate localhost/staging credentials. Generate single-use random challenges, bind to session/attempt and action, expire at 5 minutes, consume transactionally. Validate signature, RP ID, origin, challenge, credential ownership and user verification. Discoverable credentials and userVerification required; do not force platform authenticators so security keys/cross-device flows remain usable. Store credential ID, public key, opaque user handle, transports, counters, backup flags, name and created/last-used dates. Support multiple credentials and revoke individual devices. Handle synced-passkey counter behavior according to library guidance; never universally reject counter=0. Never store biometric data or private keys.

Register passkey only after recent authentication; sensitive changes require passkey or password reauthentication within 5 minutes. Removing last usable credential must leave recovery/password path. Recovery tokens single-use, hashed, expiry 15 minutes; invite tokens 24 hours. Avoid recovery solely into the shared inbox the user is locked out of. Use verified personal recovery address and one-time hashed recovery codes. Owner break-glass via documented server-admin CLI with audit; no hidden web bypass. Require owner recovery preparation before launch. Optional TOTP second factor can follow; passwords remain supported while owners should use passkeys.

Compatibility: feature-detect WebAuthn; password fallback remains visible. Test physical iOS/macOS passkeys, Android and Windows security/biometric flows; browser emulation alone is not proof. No claim of support for every historical device/browser.

## 5. Data model and invariants
All business rows carry organization_id; mailbox-scoped rows carry mailbox_id. Foreign keys and composite constraints prevent cross-organization linkage. Index hot filters; use migrations with backups and rollback notes.

Core tables:
users(id, username_normalized unique, login_email_normalized unique, display_name, password_hash, status, auth_version).
organizations; organization_memberships; sessions; passkeys; invites; recovery_tokens.
mailboxes(id, address, provider config references, credential_version, status, permission_version).
mailbox_memberships(user_id, mailbox_id unique pair, role, capability overrides).
folders(mailbox_id, provider_path, role, uidvalidity, cursor, last_success).
messages(mailbox_id, folder_id, uidvalidity, uid unique tuple, message_id, headers, body references, received_at, flags, size).
conversations(mailbox_id, subject, state, assignee, latest_revision, timestamps).
conversation_messages; labels; conversation_labels; per_user_read_cursors; notes; tasks.
drafts(id, mailbox_id, conversation_id, version, author_id, recipients, subject, body, attachment_refs, state, provider_draft_ref).
approvals(draft_id, version, content_hash, recipient_hash, approver_id, policy_version, expires_at).
send_intents(idempotency_key unique, draft_version, message_id, state, actor_id, transport_result).
attachments(owner message/draft, storage_key, safe_filename, mime, size, hash, scan_state).
rules(version, scope, conditions, actions, enabled); rule_runs; jobs; outbox_events; notifications.
knowledge_sources(scope, approved_url, freshness, revision); knowledge_chunks; retrieval_evidence.
ai_runs(model/provider, scoped context refs, usage, status, draft_version, error); audit_events.

Mailbox address/From cannot be selected arbitrarily by a client. Alias use requires verified owner-approved identity. Internal notes never enter outbound MIME, quoted customer history or unrestricted AI auto-replies. Read-by-person state is separate from provider Seen; opening by one teammate does not erase another's unread indicator. Mail delivery fields should distinguish queued, SMTP accepted, confirmed in Sent, failed and delivery unknown; SMTP accepted is not proof customer received it.

## 6. Sync, mail correctness and sending
60-second scheduler lives in worker code with durable due_at records; no AI scheduler. Claim one sync lease per mailbox; expiry/recovery handles crashes. Respect provider limits and exponential backoff/jitter; never overlap polls for a mailbox. Healthy target: start polling within 60 seconds plus documented scheduler/network delay, not an instant guarantee.

Incremental identity = mailbox/folder/UIDVALIDITY/UID. RFC Message-ID can be missing/duplicated, so never sole dedupe key. Use headers and content fingerprints for cautious cross-folder reconciliation. UIDVALIDITY reset triggers reconciliation; no mass auto-replies to reimported mail. Initial history import tagged historical: no alerts, AI or auto-send unless explicitly requested. Limit batches and prioritize new mail over background history. Periodically reconcile flags, moves, deletions and Sent; use server capabilities where available. Preserve provider copies by default.

Thread using References/In-Reply-To within mailbox, cautious fallback by normalized subject + participants + time; allow split/merge with audit. Never merge distinct customers just because subjects match. Parse MIME with limits before indexing. Attachments fetched lazily; bounded message size, part count, archive expansion and parser time. Initial limits: 25 MiB outgoing total raw attachments (also provider limit and base64 overhead), 50 MiB inbound body/attachment processing cap, mark oversized content and allow safe controlled download. Limits configurable after provider testing.

Draft sync: PostgreSQL is collaboration/version authority; IMAP Drafts is a mirrored interoperability copy. Append/replace only drafts tracked by app IDs; never delete unknown provider drafts. Debounce save 750 ms, save on blur; show Saving/Saved/Offline/conflict. Provider edits trigger conflict resolution, not silent overwrite. Optimistic version ETag/If-Match, stale writes 409. Simple edit lease + conflict dialog first; CRDT live co-edit later.

Send state machine: editing → pending_review → approved → queued → sending → smtp_accepted → sent_synced. Alternative states rejected, cancelled, failed, delivery_unknown. Manual authorized responder send is itself explicit review. AI approval hash covers exact body/subject/recipients/attachments/mailbox identity; any edit or new incoming reply invalidates approval by default. Notification approve action references same immutable version, never rebuilds a different draft.

Transactional outbox creates one send intent per approved version. Immediately before send check authorization, cancellation, newest thread revision, credential version and current policy. Delay actual submission 10 seconds for Undo Send; undo is only available before SMTP begins. Unique keys prevent repeated button taps/duplicate jobs. SMTP can accept then connection can fail: mark delivery_unknown and reconcile Sent or ask a human; NEVER blindly retry ambiguous sends. No exactly-once claim across arbitrary SMTP. Append Sent only if provider does not already do so; determine in integration tests. Preserve stable Message-ID and record SMTP response. Hard/soft bounces shown separately; no automatic repeated customer sends.

External replies from another mail client are attributed “Sent outside this app — author unknown” unless reliable provider evidence exists. Never infer which staff member sent them from the shared From address.

## 7. Information architecture and exact routes
/login, /recover, /invite/[token]: auth flows, no indexable mail.
/mail: unified authorized inbox; last-selected view restored without leaking revoked mailbox.
/mail/[mailboxId]/[view]: inbox, sent, drafts, archive, junk, trash, waiting, assigned, all.
/mail/[mailboxId]/[view]/[threadId]: direct thread route with list/filter URL state.
/search: scoped query and result list; mailbox scope always visible.
/tasks: assigned/follow-up list, /contacts: authorized customer histories.
/knowledge: approved FAQ sources/templates, role-filtered.
/insights: backlog/response/AI stats, role-filtered.
/settings/profile, security, appearance, notifications.
/settings/team, mailboxes, rules, ai, knowledge, integrations, audit, system: capability-filtered admin.

Main navigation order: Compose; All inboxes; Assigned to me; Needs reply; Waiting; Drafts; mailbox groups (Inbox/Sent/Archive/Junk/Trash expandable); Labels; Tasks; Contacts; Knowledge; Insights. Bottom: sync health, Settings, user avatar. Hide unavailable sections, do not show empty forbidden mailbox placeholders. Counts are scoped. No public share links to customer mail in v1.

## 8. Responsive layout specification
Use CSS Grid, minmax(0,1fr), min-width:0 on grid children, wrap long words/addresses, and 100dvh with 100vh fallback. Avoid global horizontal scroll. Safe-area padding using env(safe-area-inset-*); sticky controls must remain above virtual keyboard and not obscure focused inputs. Body is not nested inside several scroll containers; each visible mail pane has one scroll region.

>=1440px: 56px global header; remaining area grid 224px nav | 360px message list | minmax(480px,1fr) reading pane. Optional 320px AI/context panel overlays or replaces a portion only if reader retains 480px; no forced four-pane squeeze. Reader centered content max-width 840px.
1024–1439px: header 56px; 72px icon rail | 320px list | minmax(0,1fr) reader. Full nav opens 256px drawer. AI panel is a 360px overlay drawer with focus management.
768–1023px: header 56px; 300px list | reader; navigation drawer. On narrow split/landscape where reader <420px, switch to single-pane thread route. No permanent sidebar.
320–767px: one pane at a time. Header 56px with menu, current mailbox title, search, profile overflow. List row 88px comfortable minimum; open thread replaces list with back button, restores scroll on return. Bottom action bar minimum 56px plus safe area; Compose FAB 48px stays 16px above bar. Composer fullscreen page/dialog; no tiny floating desktop box. AI/context is full-height sheet. Filters horizontal scroll region with visible overflow cue, never page-wide overflow.
At 200% browser zoom let CSS effective viewport select narrower layouts; at 400%/320px content reflows. At 320px hide low-priority timestamp details before truncating sender; maintain accessible full text.

### Screen/component anatomy
Global header: left brand/workspace; center search (max 640px, 40px tall) on wide views; right sync status, notifications, avatar. Mobile search launches dedicated search page. No email body on dashboard preload.
Message list: 48px title/filter toolbar, tabs Needs reply/All/Assigned if applicable, row sender (14px semibold unread), date (12px), subject (14px), preview (13px), 1–2 label chips. Checkbox only on hover/focus on desktop but always accessible; mobile long-press may enter selection with explicit Select alternative. Unread marker and weight, not just color. Draft/attachment/assignee badges have text/accessible labels. Paginate first 50 summaries, Load more; consider virtualization only after keyboard/screen-reader testing.
Thread: subject 20px, mailbox From identity badge, assignee/state; 44px actions Reply, Archive, Snooze, Assign, More. Collapsed older messages show sender/date; newest expanded. Each message displays From/To/CC details toggle, date, safe body, attachment cards. A distinct Internal activity section has author/time and visually labelled internal notes.
Composer: explicit “Reply from info@…” locked to permitted mailbox, To/CC/BCC editable with validated chips, subject when needed, editor, attachment upload state, signature preview, AI tools. Footer Send / Send & close; schedule dropdown; draft saved state; discard secondary. Notes mode separate labelled tab, amber header “Internal note — not sent to customer”, button “Add note” not “Send”. AI draft shows “AI draft — review required” and Sources beside content. No auto-send just because Enter pressed; Cmd/Ctrl+Enter requires configured send shortcut and confirmation during initial onboarding.
AI panel tabs: Draft / Sources / Summary. Show rationale, source title/date/relevant excerpt, uncertainty and missing info; source access checked. Regenerate/Shorten/Tone/Translate buttons. Streaming is text-only escaped, cancellable, never locks manual reply. Apply suggestion creates new version and visible diff.
Settings: desktop 208px settings navigation + content max 960px. Mobile settings index then detail pages with back. Each section has title/help, explicit scope (Personal/Organization/Mailbox), labelled fields, inline validation, sticky Save/Cancel only while dirty, warns on leaving unsaved. Destructive actions isolated at bottom with confirmation. Disabled controls explain unmet prerequisite.
Mailbox access editor: mailbox selector; members table Name/Role/Read/Reply/Approve/Manage rules; add user search; preview “Who can access this inbox”; save audit and immediate revocation test. No use of shared mailbox password as member access.

## 9. Visual design contract
Neutral, restrained business UI; one blue primary accent, violet reserved for AI, amber for internal notes/warnings, red only danger. Light is default, dark follows explicit user choice or system; no theme flash. Use semantic variables, never one-off hex literals in components. Light/dark color pairs are starting tokens; validate every actual adjacent pair and state with automated contrast tests before accepting.

Token | Light | Dark
canvas | #F8FAFC | #0B1220
surface | #FFFFFF | #111C2E
surface-muted | #F1F5F9 | #1E293B
text | #0F172A | #F1F5F9
text-muted | #475569 | #CBD5E1
border-decorative | #CBD5E1 | #475569
border-control | #64748B | #94A3B8
accent | #1D4ED8 | #93C5FD
on-accent | #FFFFFF | #0B1220
selected-bg | #DBEAFE | #172F52
selected-text | #1E3A8A | #DBEAFE
success-bg / text | #DCFCE7 / #166534 | #123524 / #86EFAC
warning-bg / text | #FEF3C7 / #92400E | #3B2D0D / #FDE68A
danger-bg / text | #FEE2E2 / #991B1B | #451A24 / #FCA5A5
ai-bg / text | #EDE9FE / #5B21B6 | #2B204A / #DDD6FE

WCAG 2.2 AA: normal text >=4.5:1, large text >=3:1, essential icons/control boundaries/focus >=3:1 against adjacent background. Border-decorative does NOT define required control boundaries; use border-control. Disabled controls never contain essential unlabelled information. Avoid applying opacity to whole controls or colored status text. Status = icon + label, never color alone. Incoming HTML isolated from app styles; app dark mode must not arbitrarily invert email images or logos.

Font: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; no external font download. Base 16px/24px. H1 24/32 weight 650; H2 20/28 weight 600; H3 16/24 weight 600. Body/editor 16/24; compact UI 14/20; help/preview 13/20; timestamps 12/16 (nonessential only). Inputs >=16px on touch to avoid iOS zoom. Tabular numerals for dates/counts. Never set browser minimum-scale or disable zoom.
Spacing scale 4,8,12,16,24,32,48px. Cards 12px radius; fields/buttons 8px; chips 999px. Desktop page padding 24px, mobile 16px (12 at 320). Buttons 40px visual minimum, 44px interactive target minimum; touch primary 48px. Icon-only hit targets 44x44; 8px gap. Field labels above, 8px spacing, helper text below 6px; error text wraps and expands height.

Lucide SVG icons, explicit named imports, currentColor, strokeWidth=1.75, 20px standard, 16px metadata, 24px navigation emphasis. Map: Inbox, Send, FilePenLine (draft), Archive, Trash2, ShieldAlert (junk), Search, Plus, Reply, ReplyAll, Forward, Paperclip, Clock3, UserRoundCheck, Users, Tag, Sparkles, BookOpen, Settings2, KeyRound, LockKeyhole, Eye/EyeOff, Ellipsis, ChevronLeft, Menu, Check, CircleAlert, WifiOff, RefreshCw. Verify names at pinned version; missing icon replaced in documented registry, not random emoji. Default icons text-muted; active selected-text; danger explicit. Every icon-only button has aria-label and tooltip on focus/hover; SVG decorative aria-hidden. Use text labels in primary nav until rail breakpoint. No icon font, mixed emoji/icon systems or illegible grey-on-grey actions.

Layer scale: base 0, sticky 10, dropdown 30, drawer backdrop 40/drawer 50, modal backdrop 60/modal 70, toast 80, tooltip 90. Portals avoid overflow clipping. Single active modal, focus trap and inert background; return focus on close. Tooltips cannot cover focused field/error. Toasts not sole failure feedback. Animations 120–180ms opacity/transform; respect reduced-motion; never animate layout dimensions during inbox load.

Component states required: default, hover, keyboard focus, selected, disabled, loading, error, empty, offline, permission revoked, stale data. Skeletons match final dimensions, stop shimmer under reduced motion. Contrast and visual snapshots include every state in both themes.

## 10. Initial-load and runtime performance
Fast means measured on a specified fixture, not marketing. Production build only; record machine/browser/network/commit and cold versus warm cache.
Targets: p75 field LCP <=2.5s, INP <=200ms, CLS <=0.1. Lab mobile cold login <=2s LCP, cold cached-inbox route <=2.5s at 4x CPU slowdown and 1.6Mbps down/150ms RTT; record 5 runs and median/worst. TTFB target <=500ms p95 on warm service for cached authorized views under agreed 5-user load. Click-to-thread cached <=200ms p95; uncached message shows stable shell immediately then body asynchronously.
Initial compressed transfer budgets: login JS <=100KiB; inbox route JS <=200KiB; CSS <=35KiB; initial metadata <=60KiB; total first-view transfer <=400KiB excluding deliberately requested email media. These are gates to measure; revise only via written decision, never quietly. SSR/RSC serialized private data counts in transfer budget. Bundle analyzer records vendor splits.

Server-render navigation and first 50 cached message summaries; never wait on IMAP, AI, calendar or external FAQ to render inbox. Small client islands for selection/search/editor; do not mark root layout use-client. Defer editor, charts, attachment preview, passkey code and AI panel until their route/action needs them. Next server-only module boundaries prevent secrets reaching bundles. Load only needed icon exports. Use system fonts, SVG icons, no hero graphics, third-party tracking scripts or unnecessary UI framework payload.

Cursor pagination, indexed mailbox/state/date queries, precomputed authorized counts; avoid N+1 queries. Postgres full-text and exact filters first; no hosted embeddings dependency. Search debounce 250ms + cancel stale requests. Scope query before rank/snippets. SSE delivers lightweight authorized changes with resumable IDs; event filtering per subscriber and permission revocation. Fallback backoff polling, no per-tab 1-second refetch loop. Network reconnect cannot duplicate writes.

Hashed public assets cache immutable; authenticated HTML/API/body/attachments private no-store. Never service-worker cache customer mail by default. Immutable asset cache and pending-draft-in-memory work offline; no offline sending. Encrypted offline storage is deferred explicit opt-in feature. Remote images blocked by default; optional privacy proxy with SSRF protection and size/time limits. Prefetch metadata only for permitted, imminent navigation; not entire mailboxes.

## 11. AI, knowledge, rules and notifications
AI adapter has explicit states unconfigured, ready, quota_paused, reauth_required, failed. Supported subscription auth must be proven under current terms, with no extracted browser session cookies or disguised client identity. Never register a paid API key/fallback or enable credit purchases. Included quota can run out; pause AI, keep mailbox fully functional and offer template/manual reply. Open-source software does not eliminate compute/bandwidth/storage costs already covered by existing resources.

Knowledge ingestion only owner-approved HTTPS sources; block private/metadata addresses, redirects to forbidden hosts, oversized pages and crawler loops. Store URL, title, fetched time, version, scope and excerpt. Weekly code-only refresh using ETag/Last-Modified; mark stale/fetch failures. Per-mailbox templates and policies outrank historical answers. Historical retrieval is restricted to the target mailbox and explicitly shared policy library; a user with two inboxes does not authorize leaking manager data into info drafts. No global mixed context cache. Sent examples redacted for customer-specific details. Sources shown internally, safe public links only in customer mail.

One new eligible message creates one draft job keyed to message and policy revision. Summarize/classify/draft in bounded requests; don't burn tokens on junk, newsletters or history import. Model receives data, not authority; no shell/network tools or unrestricted mailbox search. Retrieval handled by app permission layer. Structured result: suggested category, summary, draft, source IDs, unsupported questions, escalation flags. Validate schema and recipient identities outside model. Self-reported confidence is not proof; auto-send depends on deterministic category/source/exclusion controls plus reviewed tests.

Auto-response modes per mailbox: Off; fixed acknowledgement; AI draft only (default); constrained FAQ acknowledgement (after explicit owner enablement). Acknowledgement says team will review, links approved information, never promises availability/refunds/admission/prices beyond current policy. No account changes, bookings or payment decisions. Exclude junk, bulk/list, bounce, auto-submitted, no-reply, internal senders, risky/sensitive/complaint/legal/payment threads. Limit one acknowledgement per conversation per 24h, max mailbox rate initially 20/hour, cooldown by sender; avoid autoresponder loops with headers and own-address detection. Human replies or new policy revisions cancel pending actions. Global kill switch disables auto-send immediately; immutable policy version and reason recorded.

Rules: trigger + AND/OR conditions + ordered actions + scope + version. Deterministic rules run before AI. Dry-run preview shows matching sample and proposed action; prevent cyclic forward/reply/label triggers using execution lineage and max depth. Prioritize spam exclusion, explicit block/allow, routing, templates, then optional AI. Rule change never retroactively sends historical replies.

WhatsApp is adapter, not OpenClaw dependency. Gate evaluates current official Business/group support and total costs; do not assume customer-facing WhatsApp integration supports existing private groups. Unofficial linked-device libraries may carry breakage/account-restriction risk and require explicit owner acceptance; no claim of official equivalence. No paid integration silently substituted. If infeasible, keep feature blocked and offer browser notifications + authenticated in-app review, not falsely mark WhatsApp complete.

Privacy: group participants must all be entitled to the mailbox before full content/drafts can be delivered; otherwise send only a generic alert with authenticated app link. Never send manager mail into info group. Reconcile group membership or default to link-only when membership cannot be proven. Links carry opaque IDs, not message bodies or approval tokens in URL. Approval in browser requires session and capability; text approvals later map verified sender identity to user and exact immutable draft version, expiring requests and rejecting ambiguous replies. Notification send failures don't trigger duplicate mail sends.

## 12. Security, privacy and reliability
Threats: malicious inbound HTML/attachments/prompt injections; stolen sessions/credentials; cross-mailbox leakage; duplicate sends; public repo leaks; SSRF; compromised integrations; concurrency; quota exhaustion.
Render HTML after robust sanitization inside sandboxed iframe without scripts/forms/same-origin privilege, or isolated safe document. Strip active content, event handlers, remote CSS, forms and dangerous URL protocols; block external resources until user consent. Escaped plain text default for untrusted previews. Links open with noopener/noreferrer; display actual destination. Attachment download after authorization, Content-Disposition attachment, nosniff; never serve uploaded executable content under same app origin. Bound extraction in isolated resource-limited process; no arbitrary file execution. Malware scan deferred until capacity proven; don't advertise attachments as safe without it.
Credentials encrypted using authenticated encryption with unique nonces and key identifiers; key outside DB/repo in service-owned 0600 file or protected environment. Backups need independent protected key recovery. Root only for provisioning; dedicated non-login service user, restrictive umask/systemd filesystem permissions. Redact bodies, tokens and passwords from logs by default. CSRF, rate limits, CSP, HSTS after verified HTTPS, frame-ancestors self, strict upload limits, dependency audit and secret scanning before publication.

Audit records actor/service principal, mailbox, action, target version, outcome, time and correlation ID. No secret/body dumping. Internally append-only via restricted DB grants; not claimed tamper-proof against server administrator. Export scoped and audited. Disabling user immediately revokes sessions and queued user-authorized sends. Backup daily encrypted DB plus attachment manifests, 7 daily + 4 weekly initially subject to disk; copy to existing trusted Mac/off-host storage if available, not new paid service. Same-server archive is rollback convenience not disaster recovery. Recovery target RPO <=24h, RTO <=4h only after restore drill. Retention limits and customer data deletion need documented rules; no blanket GDPR-compliant claim.

## 13. Testing and supported devices
Support matrix at release: latest and previous stable Chrome/Edge/Firefox desktop; Safari current and previous macOS; iOS/iPadOS Safari current and previous major; Android Chrome current/previous. Progressive password/basic mail fallback where passkeys unavailable. Test 320,375,390,768,1024,1280,1440,1920 CSS widths plus landscape. Real devices for virtual keyboard, touch, passkey, download and screen reader; Playwright Chromium/Firefox/WebKit for repeatable coverage. Record exact versions/dates, not “all devices supported”.

Accessibility: WCAG 2.2 AA target; axe automation plus keyboard-only, VoiceOver and NVDA checks. Skip link, headings, landmark regions, labelled inputs, error summary, focus restoration, live status announcements (not every streamed token), no hover-only actions. 200% text/400% zoom, reduced motion, forced colors, touch target and contrast tests. Drag/drop has button alternatives. Long email tables can scroll inside body viewport with label, not entire page.

Critical acceptance tests:
A01 Owner/A/B example rights enforced through UI, direct HTTP, attachment, search, counts, SSE and AI sources.
A02 Two staff reply as info; internal actors accurate; manager hidden from A.
A03 Passkey registration/login/replay rejection/origin rejection/revoke and password/recovery work; personal recovery independence proven.
A04 120 empty polling cycles cause zero AI calls; process restart and lease recovery do not duplicate jobs.
A05 Initial import/UIDVALIDITY reset/moves/duplicate Message-ID are safe, do not trigger historic auto-replies.
A06 Same draft sent concurrently from two browsers gives one send intent; ambiguous SMTP acceptance is flagged, not blindly retried.
A07 Draft edit/new incoming message/membership revoke invalidate stale approval; notes never sent.
A08 Current FAQ beats stale history; unsupported claims flagged; cross-mailbox retrieval and prompt injection fixtures blocked.
A09 Spam/autoreplies/bounces/rule loops/rate caps stop auto-reply; owner kill switch effective.
A10 All target sizes and themes: no overlap/clipped actions; contrast/touch/keyboard/screen-reader tests pass.
A11 Performance budgets pass recorded production cold-load + 5-concurrent-user tests while polling runs.
A12 Backup restore on clean environment proves users/messages/drafts/permissions; secrets recovered separately.
A13 AI quota/auth failure leaves manual mail and 60-second code polling usable, no paid fallback.
A14 WhatsApp group privacy/identity/duplicate/stale approval tests pass, or feature explicitly marked unavailable.
A15 External mail client actions reconcile; outside-app sender identity never fabricated.

## 14. Delivery discipline
### GitHub and VS Code / Copilot ownership (added 7 October 2026)
Implementation will take place in VS Code with GitHub Copilot, not this chat. Create a dedicated project directory and GitHub repository; NEVER initialize or publish the entire OpenClaw workspace. User wants an open-source project and continuous repository updates. Confirm GitHub owner/org, repository name and license before publication; do not assume a default license. Bootstrap the repository/documentation during W01 so feasibility decisions are also versioned; W05 adds code skeleton, CI and dependency inventory rather than delaying all Git history until G1.

Initialize Git locally, add a reviewed .gitignore, copy sanitized design documents, create README and tracker, and commit the planning baseline first. Publish the selected files to the approved GitHub destination after secret/private-data review. Public code is allowed; server inventory and real customer/staff details belong in ignored private operator notes, not public examples. Replace business-specific addresses/hostnames/IPs in public documentation with example.com placeholders. Keep the private concrete mapping available to the owner. No private keys, passwords, OAuth tokens, .env files, databases, mail samples, backups, logs, real attachment files or private deployment notes in Git—even temporary commits. Ignore local private/ and .env* while explicitly allowing sanitized .env.example. .gitignore does not remove tracked files; check git ls-files before pushing.

Use a task branch such as feat/W11-mailbox-permissions, fix/W22-smtp-reconciliation or docs/W01-baseline. Commit and push at every coherent tested checkpoint and before ending a work session; not every keystroke. Commit messages include task ID and purpose. Every checkpoint includes corresponding tests, tracker update and decision changes. Partial work is clearly marked WIP on a task branch and never reported done. Never commit or push another person's unreviewed changes. Check diff/staged diff, secret scan and relevant tests before commit; inspect remote and reconcile upstream changes safely before push. No force-push, history rewrite, destructive reset or automatic merge without explicit authorization. Never change global Git identity as a side effect.

Use pull requests for review; main remains releasable. Branch protection/required checks where available without extra cost; if unavailable, enforce same checklist manually and document the gap. GitHub issues may mirror task IDs but the committed work tracker remains canonical. An implementation phase is not complete until code/tests/docs are committed, pushed, remote commit verified, and reviewer/gate evidence recorded. Push/auth failure is a named blocker, never a successful backup claim. No auto-deploy on every push: release only an approved immutable commit/tag after release gates. Configure CI to avoid paid usage/add-ons; obtain approval before any spend.

At each Copilot session start: read project instructions/playbook/tracker, inspect git status and current branch, identify last remote checkpoint and next unblocked task. End with task status, tests, commit SHA, pushed branch/PR, blockers and next step. Carry this protocol into .github/copilot-instructions.md and a repository AGENTS.md; do not copy unrelated OpenClaw instructions. Detailed task test logs may record their own commit in the following checkpoint or PR to avoid a self-referential commit-hash edit loop.

Companion AI_WEBMAIL_WORK_TRACKER.md is authoritative work list. Run one current implementation task at a time; independent research can run in parallel but cannot bypass dependencies. No feature coding before foundation gates; no deployment as side effect of writing docs. Every change identifies a task ID and acceptance IDs.

Start session: read tracker + decisions; inspect git/status/tests; pick first unblocked todo; mark in_progress with owner. Implement smallest change; run required tests; add evidence path and commit; change to review; mark done only after acceptance verified. If blocked record reason, required decision and permitted independent work. Don't silently skip. Execute autonomously: do not wait for routine owner check-ins, preference questions with a clear safe default, or ceremonial sign-off. Review phase evidence against its written entry/exit criteria, record a technical review and decision, and proceed when criteria are met. This technical progression does not grant access to live customer data or authorize external sends, paid services, production changes/deployment, or enabling AI/WhatsApp. Those explicit privacy, security, feasibility, and external-action gates remain blocked until their required evidence/authorization exists; continue other permitted local work rather than waiting on an unrelated gate. New scope goes to backlog with priority, not hidden in active work.

Definition of done: code + migration + tests + accessibility states + error/permission paths + documentation + no secrets + measured evidence + rollback. A working screenshot is not mail delivery proof; unit tests are not live provider proof; mocked passkeys not real-device proof. Failed/skipped/unverified are distinct. Track implementation counts, not elapsed-time percentages.

Change decisions record ID/date/problem/options/trade-off/security/cost/owner approval. Revision requests update this baseline and tracker together. Maintain requirement→task→test→evidence links. Never close a promised feature because a placeholder page exists.

## 15. Release and FreeScout cutover
Read-only live inspection first: hostname/IPs/DNS/TLS, jobs, PHP/MySQL consumers, files and database size, available memory/disk, backup status. Back up FreeScout app/config/database with checksums and test readability. Inspect cron for all relevant users and supervisor definitions before disabling only FreeScout jobs. Do not delete MySQL/PHP if other services depend on them. Preserve original Nginx config and TLS renewal. No mailbox/MX migration.

Deploy staging private/authenticated, synthetic/test mailbox, outbound SMTP allowlist. Dark launch read-only, compare provider results, then test manual send to owned recipient and Sent sync. No production mass import auto-replies. Owner accepts user access and layout; security/performance/restore gates pass. Schedule cutover; stop FreeScout fetch/send workers; final archive; swap Nginx upstream to loopback app after nginx -t; verify HTTPS, login/passkey origin, mail sync and owned-recipient send. Watch resource/error queues. Rollback restores site and workers deliberately; reconcile pending send intents before old/new systems resume sending. Keep archive private for owner-approved retention, then dismantle obsolete packages/data only after dependency check and explicit deletion window. No paid Vultr snapshots without approval.

## 16. External references and open decisions
Feature research: EMAIL_SYSTEM_FEATURE_RESEARCH.md (Missive/Shortwave/Superhuman/Front/Spark/Fyxer); inspirations, not exact clone commitments. Current live research confirms Next.js server-component architecture and SimpleWebAuthn verification primitives; APIs/version support must be checked at pin time.
- https://nextjs.org/docs/app/getting-started/server-and-client-components
- https://simplewebauthn.dev/docs/packages/server
- https://www.w3.org/TR/WCAG22/
- https://web.dev/articles/vitals
- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://developers.openai.com/siwc/token-sharing-open-source
- https://imapflow.com/ and https://nodemailer.com/

Open decisions before live integration: product/repository name and license (recommend AGPL-3.0 for hosted modifications; owner chooses); confirmed hostname; exact mailbox endpoints and folder semantics; user list and mailbox memberships; FAQ sources; current supported subscription eligibility; notification group membership/integration route; business hours/acknowledgement wording; retention/recovery destinations. Do not block visual prototype on mailbox secrets; use clearly labelled synthetic fixtures. Do block real sending on credentials, permissions and recipient approval.
