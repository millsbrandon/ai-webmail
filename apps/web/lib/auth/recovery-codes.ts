import { randomBytes } from "node:crypto";
import type { WebmailDatabase } from "@ai-webmail/db/client";
import { recoveryCodes, users } from "@ai-webmail/db/schema";
import { eq } from "drizzle-orm";
import { writeAuditEvent } from "./audit";
import { hashToken } from "./csrf";

export const recoveryCodeCount = 10;
export const recoveryCodeLength = 32;

export async function replaceRecoveryCodes(
	db: Pick<WebmailDatabase, "transaction">,
	userId: string,
	now = new Date(),
	actorSessionId?: string,
) {
	const codes = Array.from({ length: recoveryCodeCount }, () =>
		randomBytes(recoveryCodeLength / 2).toString("hex"),
	);

	await db.transaction(async (transaction) => {
		await transaction
			.select({ id: users.id })
			.from(users)
			.where(eq(users.id, userId))
			.for("update");
		await transaction
			.delete(recoveryCodes)
			.where(eq(recoveryCodes.userId, userId));
		await transaction.insert(recoveryCodes).values(
			codes.map((code) => ({
				userId,
				codeHash: hashToken(code),
				createdAt: now,
			})),
		);
		await writeAuditEvent(transaction, {
			actorUserId: userId,
			actorSessionId,
			action: "recovery.rotated",
			targetId: userId,
			createdAt: now,
		});
	});

	return codes;
}
