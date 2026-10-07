# Dependency and license inventory

Review date: 7 October 2026. This is a planned direct-dependency inventory,
not a claim that every candidate has been installed or security-approved.
Package versions and SPDX license metadata were queried from the public npm
registry on the review date. Recheck advisories, transitive licenses, engine
requirements, and package provenance when each dependency is introduced.

The only installed project dependency at this checkpoint is the pinned
development tool in the root `package.json` / `package-lock.json`. TypeScript's
lockfile includes optional platform-specific compiler packages; their registry
metadata also declares Apache-2.0.

| Component | Candidate exact version | Registry license | Status / notes |
|---|---:|---|---|
| TypeScript | 7.0.2 | Apache-2.0 | Pinned root development tool; verify compatibility with framework types in W06. |
| Next.js | 16.4.0 | MIT | Planned for `apps/web`; Node >=20.9 according to package metadata; peer range includes React 18.2 or React 19. |
| React | 19.3.0 | MIT | Planned with Next.js; exact version must satisfy the selected Next.js peer range. |
| React DOM | 19.3.0 | MIT | Planned with React and Next.js. |
| Drizzle ORM | 0.45.3 | Apache-2.0 | Planned database access layer; migration API and PostgreSQL support to be tested in W06. |
| Drizzle Kit | 0.31.11 | MIT | Planned development/migration tool. |
| node-postgres (`pg`) | 8.23.1 | MIT | Planned PostgreSQL driver; pin only after connection and TLS review. |
| Zod | 4.6.5 | MIT | Planned boundary/schema validation library. |
| ImapFlow | 2.2.8 | MIT | Planned IMAP adapter; no mailbox connection in W05. |
| MailParser | 3.9.36 | MIT | Planned MIME parser; Node >=20 per registry metadata. |
| Nodemailer | 10.0.16 | MIT-0 | Planned SMTP adapter; manual sends remain out of scope in W05. |
| SimpleWebAuthn server | 14.0.3 | MIT | Planned WebAuthn verifier; actual origin/RP ID remain unconfigured pending W04. |
| `argon2` | 0.45.1 | MIT | Planned native Argon2id package; platform build and resource cost need W09 testing. |
| `sanitize-html` | 2.18.0 | MIT | Planned server-side HTML sanitizer; sanitization policy still requires security tests. |
| Lucide React | 1.52.0 | ISC | Planned icon library; pin after confirming current icon names. |
| Radix Dialog | 1.2.0 | MIT | Candidate accessible primitive; introduce only where needed. |

The exact candidate versions above are discovery snapshots, not a blanket
authorization to add all packages. Keep runtime dependencies in the workspace
that uses them; do not add a package merely because it appears here. No
OpenClaw, API-billing SDK, WhatsApp client, Redis client, analytics service, or
hosted vector database is approved.

Before adding/updating packages:

1. Check the package's supported Node range, exact license, release activity,
   advisory status, and relevant protocol/security behavior.
2. Review the complete lockfile, direct/transitive licenses, and audit output.
3. Pin exact versions and commit the lockfile; do not use floating tags or
   install scripts without review.
4. Record exceptions and accepted risk in the tracker/decision record.

Current evidence for W05: root TypeScript is exact-pinned; `npm ci
--ignore-scripts` and `npm audit` passed under Node 24.21.0 with zero reported
vulnerabilities; full Git history and staged changes are scanned with Gitleaks.
The listed application packages are candidates only; full transitive
dependency/license review is repeated as packages are actually added in
W06/W07.
