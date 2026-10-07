# AI Webmail

An open-source, self-hosted shared-inbox webmail application for existing
IMAP/SMTP accounts. The intended stack and safety requirements are documented
in [`docs/AI_WEBMAIL_DESIGN_PLAYBOOK.md`](docs/AI_WEBMAIL_DESIGN_PLAYBOOK.md).

**Status: foundation work in progress.** No application features have been
implemented or tested against a mail provider, and nothing has been deployed.
The 40-task tracker records completion only when evidence and acceptance
criteria are met; W01 and W05 are complete, and W06 foundation work is in
progress. See
[`docs/AI_WEBMAIL_WORK_TRACKER.md`](docs/AI_WEBMAIL_WORK_TRACKER.md).

## Project boundaries

- This is a standalone Next.js project. OpenClaw is not a runtime or dependency.
- It connects to existing IMAP/SMTP accounts; it is not a replacement mail
  server and does not require changing MX records.
- Mailbox access is explicitly scoped per user. AI and notifications must obey
  the same authorization boundaries as the inbox.
- AI and WhatsApp integrations remain disabled unless supported, policy-
  compliant, privacy-safe, and usable without additional paid services.
- Public examples and design documents contain no real mailbox credentials,
  customer mail, private server inventory, or staff mailbox mapping.

## Documents

- [Design and implementation playbook](docs/AI_WEBMAIL_DESIGN_PLAYBOOK.md)
- [Gated work tracker](docs/AI_WEBMAIL_WORK_TRACKER.md)
- [Feature research](docs/EMAIL_SYSTEM_FEATURE_RESEARCH.md)
- [Design validation](docs/AI_WEBMAIL_DESIGN_VALIDATION.md)
- [Repository structure](docs/REPOSITORY_STRUCTURE.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Dependency/license inventory](docs/DEPENDENCY_INVENTORY.md)
- [Architecture decision record](docs/decisions/ADR-0001-initial-architecture.md)
- [Local development setup](docs/DEVELOPMENT.md)

## License

AGPL-3.0-only. See [`LICENSE`](LICENSE).
