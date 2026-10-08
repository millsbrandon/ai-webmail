# Initial threat model

Status: initial design baseline for W05; not a completed security assessment.
Scope: the intended self-hosted shared-inbox application and its repository.
No live mail, provider credentials, or production infrastructure is in scope.

## Security objectives

- A user can read or act only on mailboxes and capabilities explicitly granted
  to that user.
- Customer content, credentials, authentication material, and private
  deployment inventory never enter public Git history or unauthorized output.
- Untrusted email, attachments, knowledge pages, and model output cannot become
  executable instructions or cross a mailbox boundary.
- Sending is attributable, permission-checked, version-bound, and not blindly
  retried after an ambiguous SMTP result.
- IMAP polling continues without model requests when no eligible new message
  exists; failure of optional AI/notification integrations does not disable
  manual email.
- Web service and worker operate with least privilege and do not expose
  database, worker, or provider credentials to the browser.

## Assets and trust boundaries

| Asset | Highest-risk boundary |
|---|---|
| Inbound/outbound messages, headers, attachments, notes, drafts, and search indexes | Between mailbox scopes, users, browser responses, worker jobs, logs, and backups |
| Mailbox IMAP/SMTP credentials and encryption keys | Between operator provisioning, database, service process, logs, and backups |
| User password hashes, sessions, recovery material, and passkeys | Between browser, authentication endpoints, database, and recovery operator |
| Memberships, capabilities, approvals, and audit events | Between user-controlled requests and server-authoritative domain services |
| Approved knowledge and retrieval evidence | Between public/approved sources, mailbox scope, AI adapter, and outbound draft |
| Public repository and release artifacts | Between private operator environment and public GitHub |
| Durable sync/send jobs and provider state | Between database transactions, worker leases, IMAP, and ambiguous SMTP outcomes |

Trust zones: public browser; authenticated application server; isolated worker;
PostgreSQL; private attachment/key storage; existing IMAP/SMTP provider;
owner-approved HTTPS knowledge sources; optional external AI/notification
services (currently blocked); public GitHub repository.

## Threats and required controls

| Threat / failure | Required control before the corresponding feature is enabled | Acceptance evidence |
|---|---|---|
| Cross-mailbox IDOR, counts/snippets leakage, unauthorized attachment or AI source | Enforce organization + mailbox + capability in server services and scoped queries before fetching/ranking; deny by default; recheck before send/notification; cache keys include user and permission version | A01,A02; W11,W12,W18,W25,W31 |
| Shared From identity hides the individual sender | Fixed server-selected mailbox identity; immutable draft version; record author, approver, sender and delivery state | A02,A07; W19,W21,W22 |
| Malicious HTML, remote tracking, active links, parser abuse, oversized MIME/archive | Bounded parsing; maintained sanitizer; isolated rendering; block remote resources; safe attachment download; strict size/time/decompression limits | A05,A08; W16,W35 |
| Prompt injection in message, attachment, FAQ, or historical reply | Treat retrieved content as untrusted data; no model tools or authority; retrieval performed by permission-aware code; validate output and recipients outside model | A08; W25–W28 |
| SSRF through mailbox endpoints, FAQ URLs, redirects, or remote images | Explicit admin endpoint configuration; block metadata/loopback/private targets unless deliberately allowlisted; revalidate every redirect and resolved address; TLS verification mandatory | W13,W25,W35 |
| Credential, session, recovery, or passkey theft/replay | Argon2id; opaque server sessions; CSRF/origin checks; one-use short-lived WebAuthn challenges; hashed recovery tokens/codes; account cooldown; trusted-source rate limit before public exposure; revocation | A03; W09,W10,W12,W35 |
| Cross-site request, script execution, clickjacking, unsafe outbound link | CSRF and Origin validation for mutations; CSP/frame controls; sanitized isolated email view; `noopener`/`noreferrer`; safe URL scheme allowlist | A03,A08; W07,W16,W35 |
| Duplicate or unauthorized send from races, stale draft approval, revoked user, or SMTP timeout | Transactional outbox and unique intent key; immutable content/recipient hash; immediate capability/policy/thread recheck; `delivery_unknown` on ambiguous acceptance, never blind retry | A06,A07,A15; W21–W23 |
| Worker crash, duplicate poll, UIDVALIDITY reset, history import causes retroactive action | Durable mailbox/folder UID state, leases with recovery, idempotency constraints, historical-import marker, no AI/notification/auto-send for history | A04,A05; W14,W15 |
| AI or WhatsApp discloses content to an unapproved provider/audience or creates extra spend | Keep adapter disabled until documented supported eligibility, audience proof, cost authorization, privacy tests, and owner sign-off; no paid fallback | A13,A14; W02,W03,W26,W32 |
| Secret or personal-data publication | Ignore local private paths; inspect staged diff and tracked-file list; Gitleaks scan all Git history before push; sanitized fixtures only | W01,W05 and every public checkpoint |
| Dependency compromise, incompatible license, vulnerable transitive package | Exact pins/lockfile; review direct and transitive licenses/advisories/provenance; update through reviewed task branch; no automatic dependency upgrades | W05,W07,W35 |
| Resource exhaustion on small host | Bound message sizes, jobs, concurrency, database pools and parser budgets; measure on target class before deployment; never build on live mail host | A11; W34,W38 |
| Operator/service compromise or destructive maintenance | Non-root application services, restricted network/filesystem permissions, audited administrative access, tested off-host restore, rollback plan | A12; W35,W37–W40 |

## Residual risks and release gates

- A server administrator can access plaintext handled by the service; database
  encryption alone does not prevent this. Operational access and backups need
  explicit protection.
- SMTP cannot guarantee exactly-once delivery after all network failures;
  unresolved acceptance must surface as `delivery_unknown`.
- Sanitization, malware scanning, provider-specific IMAP behavior, capacity,
  AI eligibility, WhatsApp audience/privacy, and recovery are not proven by
  this document.
- AI, WhatsApp, real mailboxes, outbound customer mail, and deployment remain
  disabled until their tracker gates pass. Test with synthetic data until then.

This threat model must evolve with the implementation and be reviewed against
actual routes, jobs, schemas, and tests before any live mailbox is connected.
