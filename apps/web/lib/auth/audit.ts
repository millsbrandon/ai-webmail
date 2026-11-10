import type { WebmailDatabase } from "@ai-webmail/db/client";
import { auditEvents } from "@ai-webmail/db/schema";

type AuditEvent = Omit<typeof auditEvents.$inferInsert, "id">;

export async function writeAuditEvent(
	db: Pick<WebmailDatabase, "insert">,
	event: AuditEvent,
) {
	await db.insert(auditEvents).values(event);
}
