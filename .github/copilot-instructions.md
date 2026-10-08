# GitHub Copilot instructions

Read [`../AGENTS.md`](../AGENTS.md),
[`../docs/AI_WEBMAIL_DESIGN_PLAYBOOK.md`](../docs/AI_WEBMAIL_DESIGN_PLAYBOOK.md),
and [`../docs/AI_WEBMAIL_WORK_TRACKER.md`](../docs/AI_WEBMAIL_WORK_TRACKER.md)
at the start of every session. The tracker is the authoritative ordered task
list; resume from its last committed state and work only the next unblocked
task.

Operate autonomously and keep implementation moving without routine owner
check-ins or ceremonial sign-off. Use safe defaults, review evidence against
the written phase criteria, record technical gate decisions, and proceed to
the next unblocked local task. This does not authorize live mailbox/customer
data access, sending mail, paid services, production changes/deployment, or
enabling AI/WhatsApp; those explicit safety and feasibility gates remain in
force. Continue other permitted work rather than waiting on an unrelated gate.

The project is standalone and must not depend on OpenClaw. Use Node.js 24 LTS
from `.node-version` and the exact npm/lockfile pins. Protect mailbox
boundaries at every server-side surface, use synthetic mail for development,
and keep private inventory, credentials, customer content, and staff mappings
out of public commits. Only placeholder `.env*.example` templates are allowed.
Do not introduce paid services or silently bypass the
AI/WhatsApp feasibility gates. Keep manual email usable when integrations are
unavailable.

Use task branches and pull requests. Before each checkpoint, inspect the full
diff, run relevant free/local checks and a secret scan, update the tracker,
commit, push, and verify the remote SHA. Do not deploy on push or use destructive
Git operations. At the foundation stage, validate with `npm ci --ignore-scripts`,
`npm audit`, `npm run lint`, `npm run typecheck`, `npm run build`,
`npm run worker:build`, `npm run test:unit`, `npm run test:integration`,
`npm run test:e2e`, relevant database migration checks, and
`git diff --check`, `gitleaks git --no-banner --redact --log-opts='--all'`,
and `gitleaks protect --staged --no-banner --redact`. Review native install
scripts before running them. The local database and browser prerequisites are
documented in `docs/DEVELOPMENT.md`; Playwright requires
`npx playwright install chromium`.
