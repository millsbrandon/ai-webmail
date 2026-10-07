# Contributor and agent instructions

## Start and task discipline

1. Read this file, `docs/AI_WEBMAIL_DESIGN_PLAYBOOK.md`, and
   `docs/AI_WEBMAIL_WORK_TRACKER.md` before making changes.
2. Inspect Git status, the current branch, and the latest remote checkpoint.
3. Work the tracker in order, with only one implementation task in progress.
   Do not mark work done without code/documentation review, required tests,
   acceptance evidence, and a pushed checkpoint.
4. Keep the tracker, requirements, and decision records consistent. Record
   blocked work honestly and do not bypass phase gates.

## Product and safety boundaries

- Build a standalone application; never add OpenClaw as a dependency, scheduler,
  AI bridge, authentication layer, or WhatsApp service.
- Keep mailbox authorization enforced in backend services and scoped queries.
  Admin status alone does not grant mail-content access.
- Never commit credentials, private keys, `.env` files, customer mail,
  attachments, databases, backups, logs, or private deployment inventory.
  Public examples use `example.com`; private operator notes stay ignored.
- Do not access or migrate live customer mail without an explicit, task-specific
  owner instruction. Use synthetic fixtures for development.
- No additional paid subscriptions, API billing, credit purchases, or paid
  fallback. Do not use unsupported subscription authentication or scrape
  browser cookies. If AI eligibility is unproved, leave AI disabled and retain
  normal manual email operation.
- Do not claim an unofficial WhatsApp client is an official or supported group
  API. Keep WhatsApp blocked unless feasibility, costs, risk, and audience
  authorization have been accepted.
- Do not deploy, send customer mail, change DNS/MX, or alter the existing
  FreeScout/server services as a side effect of development.

## GitHub checkpoints

- Use a dedicated task branch and pull request for each coherent task.
- Review staged and unstaged diffs, run applicable tests and a secret scan, then
  commit with the task ID and update the tracker.
- Push each tested checkpoint and at session end. Verify the remote SHA; report
  authentication or push failures as blockers.
- Never force-push, rewrite history, reset destructively, overwrite others'
  work, or change global Git identity. Do not enable paid checks or automatic
  deployment.
- The canonical task list and phase gates are in
  `docs/AI_WEBMAIL_WORK_TRACKER.md`.

## Validation

Use Node.js 24 LTS as selected in `.node-version`. The exact npm version is
recorded in `package.json`; use the committed `package-lock.json`.

At the foundation stage, run `npm ci --ignore-scripts`, `npm audit`, and
`gitleaks git --no-banner --redact --log-opts='--all' .`. Review install scripts
before allowing them; later native dependencies may require an explicitly
reviewed build step. Application test commands do not exist until later tasks.
For documentation-only changes, at minimum inspect the diff, run
`git diff --check`, and scan for private identifiers/secrets before committing.
Document exact commands and results in the tracker; do not imply unrun checks
passed.
