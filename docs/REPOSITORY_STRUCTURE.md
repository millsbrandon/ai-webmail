# Repository structure

The intended boundaries are deliberately small. W05 records the layout; W06
adds the runnable web/worker/database skeleton. Do not create a service per
feature.

```text
apps/
  web/                 Next.js routes, UI, and authenticated server handlers
  worker/              bounded Node worker for polling and durable jobs
packages/
  domain/              mailbox-scoped authorization and mail state machines
  db/                  schema, migrations, repositories, and test fixtures
  contracts/           validated API/job/event contracts
  integrations/        isolated IMAP, SMTP, AI, knowledge, and notification adapters
  ui/                  design tokens and accessible shared UI primitives
tests/
  unit/ integration/ e2e/ accessibility/ security/ load/
docs/
  decisions/            architecture decision records
  evidence/             sanitized task evidence only
ops/                    secret-free deployment/backup examples and scripts
```

Server-only code owns provider credentials and private data access. The web app
and worker call typed domain services. The worker uses a narrowly scoped service
identity, not a browser session or owner cookie. Adapter packages cannot grant
authorization; domain services enforce organization, mailbox, and capability
scope before data access or side effects.

The only public examples/fixtures are synthetic. Private operator notes,
credentials, databases, attachments, backups, logs, and deployment inventory
must remain outside the repository.
