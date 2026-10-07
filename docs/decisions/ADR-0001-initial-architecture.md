# ADR-0001: Initial application architecture

- Status: accepted as an implementation direction; provider/integration gates remain blocked
- Date: 7 October 2026
- Owners: project owner and implementation
- Related work: W01, W05; playbook sections 1–6 and 11–15

## Context

The product is a standalone, self-hosted shared-inbox webmail application for
existing IMAP/SMTP accounts. It must preserve mailbox-level isolation, permit
manual email when optional services are unavailable, run a durable 60-second
code-only sync, and avoid new paid services. The initial host is resource
constrained; no deployment or capacity claim is made by this decision.

## Decision

- Use a TypeScript monorepo with Next.js App Router for the web interface and a
  separate bounded Node worker.
- Use PostgreSQL as the transactional source of truth and Drizzle migrations;
  keep queue/outbox state in PostgreSQL. Do not introduce Redis or a hosted
  queue by default.
- Use maintained adapters for IMAP, MIME parsing, SMTP, WebAuthn, password
  hashing, request validation, and HTML sanitization. Never implement those
  protocols/cryptographic primitives from scratch.
- Keep integrations behind server-only adapters. AI and WhatsApp are disabled
  until their specific owner-approved feasibility, privacy, and cost gates
  pass. Mailbox/provider secrets do not enter the browser or public repository.
- Pin Node 24 LTS as the intended runtime line and pin package versions with
  the npm lockfile. Exact runtime and dependency versions remain subject to
  W05/W06 compatibility, support, security, and license checks.
- Develop and test locally with synthetic data. Do not build on or change the
  existing mail server during foundation work.

## Alternatives considered

- Existing webmail products: rejected because the requested custom Next.js
  product and explicit workflow/authorization rules are not met.
- A replacement mail server: rejected; existing mailbox hosting and MX remain.
- One process per feature or microservices: rejected for v1 complexity and
  resource overhead.
- Redis/hosted queue: rejected by default; PostgreSQL provides the required
  transactional jobs and leases without another service.
- Direct AI API key or unofficial WhatsApp client: rejected because no extra
  spend or unsupported integration path is authorized.

## Consequences

- PostgreSQL-backed jobs/outbox, permission-aware domain services, and
  separately testable provider adapters are foundational.
- The application cannot enable AI/WhatsApp until explicit feasibility gates
  pass; manual mail must remain functional without them.
- Runtime/library updates require reviewed lockfile changes and compatibility,
  license, advisory, and test evidence.
- Node and package registry metadata seen during W05 is discovery evidence, not
  a substitute for local repeatable builds or per-task integration tests.
- Release and deployment remain blocked until owner acceptance, security,
  performance, backup/restore, and rollback gates are met.

## Validation / reconsideration

W05 records the threat model and candidate dependency inventory. W06 must
prove repeatable local start and database-role separation. Revisit the database
or runtime choice if measured development/target-host constraints invalidate
this direction; record a superseding ADR rather than silently changing it.
