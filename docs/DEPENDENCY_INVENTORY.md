# Dependency and license inventory

Review date: 7 October 2026. This inventory distinguishes installed direct dependencies from uninstalled
candidates. Package versions and SPDX license metadata were queried from the
public npm registry on the review date. Recheck advisories, transitive licenses,
engine requirements, and package provenance when dependencies change.

Installed packages and candidates are pinned in their owning workspace's
`package.json` and the root `package-lock.json`. TypeScript's lockfile includes
optional platform-specific compiler packages; their registry metadata also
declares Apache-2.0.

| Component | Pinned version | Registry license | Status / notes |
|---|---:|---|---|
| TypeScript | 6.0.3 | Apache-2.0 | Installed root/workspace development tool. |
| Next.js | 16.4.0 | MIT | Installed in `apps/web`; Node >=20.9 according to package metadata. |
| React | 19.3.0 | MIT | Installed in `apps/web`. |
| React DOM | 19.3.0 | MIT | Installed in `apps/web`. |
| Drizzle ORM | 0.45.3 | Apache-2.0 | Installed database access layer; PostgreSQL migrations validated in W06. |
| Drizzle Kit | 0.31.11 | MIT | Installed stable migration tool; nested esbuild is overridden to patched 0.25.12. CLI and migration behavior validated in W06. |
| node-postgres (`pg`) | 8.23.1 | MIT | Installed PostgreSQL driver; local runtime and migration connections validated. |
| `tsx` | 4.23.15 | MIT | Installed worker development runner. |
| `@types/node` | 24.19.1 | MIT | Installed root Node.js type definitions. |
| `@types/react` | 19.3.0 | MIT | Installed web type definitions. |
| `@types/react-dom` | 19.3.0 | MIT | Installed web type definitions. |
| `@types/pg` | 8.15.5 | MIT | Installed database type definitions. |
| `tsx` | 4.23.15 | MIT | Installed in the web, worker, and database workspaces to run TypeScript development/test files. |
| Playwright Test | 1.63.0 | Apache-2.0 | Installed web development dependency for Chromium end-to-end checks. |
| `@axe-core/playwright` | 4.13.0 | MPL-2.0 | Installed web development dependency for automated WCAG 2.2 A/AA and accessibility best-practice checks; license applies to this test-only dependency. |
| Zod | 4.6.5 | MIT | Planned boundary/schema validation library. |
| ImapFlow | 2.2.8 | MIT | Planned IMAP adapter; no mailbox connection in W05. |
| MailParser | 3.9.36 | MIT | Planned MIME parser; Node >=20 per registry metadata. |
| Nodemailer | 10.0.16 | MIT-0 | Planned SMTP adapter; manual sends remain out of scope in W05. |
| SimpleWebAuthn server | 14.0.3 | MIT | Planned WebAuthn verifier; actual origin/RP ID remain unconfigured pending W04. |
| `argon2` | 0.45.1 | MIT | Planned native Argon2id package; platform build and resource cost need W09 testing. |
| `sanitize-html` | 2.18.0 | MIT | Planned server-side HTML sanitizer; sanitization policy still requires security tests. |
| Lucide React | 1.52.0 | ISC | Planned icon library; pin after confirming current icon names. |
| Biome | 2.5.15 | MIT OR Apache-2.0 | Installed foundation linter/formatter, replacing an ESLint config whose dependency chain included a high-severity braces advisory. |
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

W06 dependency decision: the initial workspace audit found 9 advisories in
eslint-config-next's `fast-glob`/`braces` chain and Drizzle Kit 0.31.11's
deprecated `@esbuild-kit` loader. The ESLint config was removed in favor of
Biome; TypeScript was pinned to 6.0.3; stable Drizzle Kit is retained with its
nested esbuild overridden to 0.25.12, outside the advisory's affected range.
The final `npm audit` reports 0 vulnerabilities.

Current evidence: direct dependencies are exact-pinned; W06 lint, typecheck,
production web build, worker build and shutdown, local database migrations,
runtime-role DML/DDL checks, production health endpoint, and a fresh repeatable
Docker Compose start pass. W07 lint/typecheck/build, four unit tests, one
isolated-PostgreSQL integration test, three Chromium end-to-end/accessibility
tests, and full npm audit pass locally. GitHub Actions validation is pending
the W07 review branch.
