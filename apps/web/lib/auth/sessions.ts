import { randomBytes } from "node:crypto";
import type { WebmailDatabase } from "@ai-webmail/db/client";
import { authSessions, users } from "@ai-webmail/db/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { hashToken, newCsrfToken } from "./csrf";

export const idleSessionMs = 12 * 60 * 60 * 1000;
export const absoluteSessionMs = 7 * 24 * 60 * 60 * 1000;

type SessionWriter = Pick<WebmailDatabase, "insert">;

export async function createSession(
	db: SessionWriter,
	userId: string,
	now = new Date(),
) {
	const sessionToken = randomBytes(32).toString("base64url");
	const csrfToken = newCsrfToken();
	const absoluteExpiresAt = new Date(now.getTime() + absoluteSessionMs);

	await db.insert(authSessions).values({
		userId,
		tokenHash: hashToken(sessionToken),
		csrfTokenHash: hashToken(csrfToken),
		createdAt: now,
		lastSeenAt: now,
		lastAuthenticatedAt: now,
		idleExpiresAt: new Date(now.getTime() + idleSessionMs),
		absoluteExpiresAt,
	});

	return { sessionToken, csrfToken, absoluteExpiresAt };
}

export async function getActiveSession(
	db: WebmailDatabase,
	sessionToken: string,
	now = new Date(),
) {
	const tokenHash = hashToken(sessionToken);
	const [session] = await db
		.select({
			id: authSessions.id,
			userId: users.id,
			email: users.email,
			displayName: users.displayName,
			csrfTokenHash: authSessions.csrfTokenHash,
			absoluteExpiresAt: authSessions.absoluteExpiresAt,
			lastAuthenticatedAt: authSessions.lastAuthenticatedAt,
		})
		.from(authSessions)
		.innerJoin(users, eq(authSessions.userId, users.id))
		.where(
			and(
				eq(authSessions.tokenHash, tokenHash),
				eq(users.status, "active"),
				isNull(authSessions.revokedAt),
				gt(authSessions.idleExpiresAt, now),
				gt(authSessions.absoluteExpiresAt, now),
			),
		)
		.limit(1);

	if (!session) {
		return undefined;
	}

	const [refreshed] = await db
		.update(authSessions)
		.set({
			lastSeenAt: now,
			idleExpiresAt: sql`LEAST(${authSessions.absoluteExpiresAt}, ${new Date(now.getTime() + idleSessionMs)})`,
		})
		.where(
			and(
				eq(authSessions.id, session.id),
				isNull(authSessions.revokedAt),
				gt(authSessions.idleExpiresAt, now),
				gt(authSessions.absoluteExpiresAt, now),
			),
		)
		.returning({ id: authSessions.id });

	return refreshed ? session : undefined;
}

export async function revokeSession(
	db: WebmailDatabase,
	sessionToken: string,
	now = new Date(),
) {
	await db
		.update(authSessions)
		.set({ revokedAt: now })
		.where(
			and(
				eq(authSessions.tokenHash, hashToken(sessionToken)),
				isNull(authSessions.revokedAt),
			),
		);
}
