# Open-source AI webmail: feature research

Research date: 7 October 2026
Purpose: feature inspiration and a build backlog for a private, self-hosted, open-source IMAP/SMTP webmail app. This is not a recommendation to subscribe to any of the products below.

## Competitor feature scan

### Missive — Productive / Business

- Shared and personal inboxes, aliases, multiple signatures, labels, snooze, send later/undo-send, auto CC/BCC, and full email history.
- Team collaboration around conversations: internal threads, assignments, collaborative drafts, team spaces/chat, guest access, team signatures, read statuses, contact books, and audit trail.
- Rules and workflow automation: conditions/actions, auto-assignment, routing, delayed follow-ups, and automations triggered by incoming/outgoing mail or user actions.
- Contextual AI assistant: search mail and prior conversations, consult calendars and contacts, find canned responses, create/edit drafts, ask clarifying questions, translate, summarize, and run reusable prompts/AI rules.
- Canned responses can be team-shared, categorized, personalized with recipient variables, and used as context for AI replies.
- Integrations/API/MCP and basic or advanced analytics are tiered. Productive is listed at $24/user/month billed annually; Business at $36/user/month billed annually. AI may use Missive credits or a customer's own model-provider key, which can add provider charges.

Sources: [Missive pricing](https://missiveapp.com/pricing), [AI assistant](https://missiveapp.com/docs/ai/overview), [rules](https://missiveapp.com/docs/advanced-features/rules/), [canned responses](https://missiveapp.com/docs/core-features/canned-responses/).

### Shortwave — Business / Premier / Max

- AI-powered search across email history, with larger plan limits for history retained, number of threads considered, and context size.
- User-authored AI filters that classify and organize mail; 3 on Business, 10 on Premier, and 50 on Max.
- AI autocomplete, summaries, attachment analysis, web browsing/integrations, snippets, read statuses, and link tracking.
- Business is listed at $30/seat/month; Premier $45; Max $120. Higher tiers raise AI request allowances and search context. Its separate Tasklet product is needed for 24/7 automated drafting and app-connected workflows.

Source: [Shortwave pricing and feature matrix](https://www.shortwave.com/pricing/).

### Superhuman Mail — Starter / Business

- AI writing, instant replies, event extraction, autocorrect/autocomplete, summaries, auto-labels, auto-reminders, and auto-archive.
- Business adds auto-drafts, Ask AI, custom AI labels, personalization/voice matching, knowledge base, and CRM integrations/recent-open tracking.
- Productivity features include split inbox, snippets, reminders/snooze, send later/undo send, unsubscribe/block, read statuses, and calendar tools.
- Team features include shared conversations/drafts, private comments, team snippets, team read/reply indicators, scheduling, and shared team knowledge.
- Business is listed at $33/member/month billed annually. Starter is $25/member/month billed annually.

Source: [Superhuman Mail plans](https://superhuman.com/plans/mail).

### Front — Professional / Enterprise (AI add-ons/features vary by plan)

- Shared inboxes, live views, assignments, tags, internal comments, shared drafts, templates, scheduling/snoozing, guest reviewers, calendar/meeting scheduling, and real-time team availability.
- Copilot can answer questions about a customer, summarize conversations, find similar past conversations and knowledge articles, and draft/refine replies using history and knowledge sources.
- AI features also include topic analysis, compose/refine, translation, summaries, QA, CSAT inference, and MCP access for external AI tools.
- Autopilot supports automated triage, handoff, and resolution; teams can use workflow rules to control which conversations go to AI versus humans.
- Native WhatsApp is an add-on on Professional/Enterprise; Front lists Meta-billed WhatsApp costs plus a 20% admin fee. That makes it a feature reference, not a fit for the no-extra-subscription constraint.

Sources: [Front pricing/features](https://front.com/pricing), [Copilot](https://help.front.com/en/articles/4848832), [AI agents](https://help.front.com/en/articles/4991744), [WhatsApp pricing note](https://front.com/pricing#add-ons).

### Spark — Plus / Pro

- AI writing, quick replies, summaries, translations, AI assistant over messages/attachments/events, custom templates, and meeting notes.
- Inbox productivity includes smart/unified inbox, search, snooze, reminders, scheduled send, mark-as-done, smart folders, mute, command center, and link sharing.
- Pro adds unlimited meeting notes, read statuses, advanced team collaboration, HubSpot, and triage-capable CLI access. Spark currently labels Autopilot and Auto-Drafts as “SOON”, so they should not be treated as available Pro features yet.
- Pro is listed at $20/user/month, with annual pricing also shown.

Source: [Spark plans and full comparison](https://sparkmailapp.com/pricing).

### Fyxer — Pro / Team

- Drafts replies in the user's tone as mail arrives; automatically labels/organizes mail and maintains a refreshed follow-up list.
- Meeting recording, summaries, follow-up extraction, shared spaces/notes, and automated Flows; Team adds shared context/admin controls and a shared view of outstanding follow-ups/owners.
- Plan includes metered credits, with automation and inbox-sorting limits; useful to study as an example of proactive automation and follow-up tracking, not as a zero-cost implementation model.

Sources: [Fyxer pricing](https://www.fyxer.com/pricing), [Fyxer plan details](https://support.fyxer.com/article/fyxer-plans-and-free-trial).

## Combined feature backlog for our app

### P0 — reliable email handling and human control

1. **Fast, familiar webmail:** responsive inbox, folder/label sidebar, threaded conversation view, compose/reply/forward, attachments, signatures, unread/star/priority, and keyboard shortcuts.
2. **Reliable IMAP sync:** poll every minute without AI; use stable message IDs/UIDs and a durable processed-event ledger; recover after restart; never duplicate notifications or drafts. Handle direct enquiries and website-form notifications safely, resolving the customer's address rather than replying to the form sender.
3. **Real mailbox drafts:** save replies in the provider's Drafts folder via IMAP; keep edit/sent state synchronized with the mailbox. SMTP sends only after an explicit authorized action.
4. **Search and everyday triage:** search sender, subject, body, date, folder, attachment, and labels; quick filters/views for unread, urgent, waiting, assigned, and needs-reply.
5. **Spam and safe rules:** deterministic allow/block lists, sender/domain/subject conditions, junk folder controls, auto-label/archive/route, and a rule dry-run/preview. Never let a suspected spam message trigger AI or an automatic response by default.
6. **Human approval:** show the original message beside the proposed response and its sources; edit/reject/request a revision; bind approval to the exact draft version and recipient; recheck for a newer customer reply and prevent double-send.
7. **Cost controls:** no model call on an empty poll; no API-key fallback; configurable AI actions; usage/limit display and a hard stop on quota/auth failure.

### P1 — useful AI assistance

8. **Grounded reply drafting:** retrieve relevant current FAQ pages, approved policies, canned responses, and prior sent replies. Show which sources informed the draft, prefer current published policy over older email, and mark uncertainty rather than inventing an answer.
9. **Conversation summary and intent:** short thread summary, issue/topic, urgency, sentiment/temperature, requested actions, missing information, and a suggested next step.
10. **Search past work in natural language:** “Have we handled this before?” should find relevant sent/received threads and explain why they match, without copying another customer's personal details into a new response.
11. **Writing tools:** draft from scratch, shorten/expand, change tone, proofread, translate, and reply from reusable snippets/templates with recipient-aware variables.
12. **AI classifications and filters:** create suggested labels/rules from examples; let a user test a rule against past mail before enabling it; keep deterministic rules separate from AI rules.
13. **Useful attachment handling:** identify attachment types and, when explicitly requested, extract/summarize PDFs and office documents. Treat attachment text and email content as untrusted input, never as instructions to the app.

### P2 — team operations and selective automation

14. **Shared-team workflow:** assign/claim conversations, internal-only notes and @mentions, reply indicators, shared drafts, reviewer roles, and a small team activity/audit log.
15. **Follow-up management:** snooze/remind, due dates, “waiting on customer” state, response-time/SLA reminders, and follow-up drafts that automatically cancel when the customer replies.
16. **Customer-safe acknowledgement:** optional immediate acknowledgement with a fixed, approved template first. Later, allow AI to send only narrow FAQ-backed replies under explicit per-category rules, with rate limits, confidence/source requirements, exclusions, and a visible audit log. Keep substantive answers as drafts by default.
17. **WhatsApp review notifications:** notify the chosen private group with a short reference, sender/subject, original-message preview, proposed draft, and secure approve/edit/reject actions. The WhatsApp integration path and any platform restrictions/costs must be checked before implementation.
18. **Contacts and interaction history:** contact details, previous conversations, notes and relevant prior resolutions.
19. **Operational analytics:** backlog, response-time trends, overdue threads, labels/topics, draft acceptance/edit rates, automation outcomes, and AI usage.

### Later / only if they solve a real need

- Multiple mailboxes/accounts and cross-account unified inbox.
- CRM/calendar integrations, shared availability/booking, and external app integrations/MCP.
- Read receipts/link tracking, broad omnichannel support, and autonomous AI resolution.
- SSO, granular roles, retention controls, encryption-key management, and organization-level compliance tooling.

## Recommended build order

1. Make IMAP/SMTP, threading, drafts, duplicate prevention, and authentication dependable.
2. Add searchable inbox, labels, spam controls, snippets, and manual team approval.
3. Add FAQ/prior-reply retrieval, summaries, labels, and grounded draft generation.
4. Add WhatsApp alerts and tightly constrained optional acknowledgement automation.
5. Add team analytics, follow-ups, and more advanced rules after normal workflows are proven.

For our actual app, the differentiators should be **self-hosted privacy, IMAP compatibility, no AI work on empty minute checks, source-grounded drafts, and safe human approval**—not copying expensive features that do not help manage this mailbox.
