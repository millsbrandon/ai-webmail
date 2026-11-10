import { randomBytes } from "node:crypto";
import type { WebmailDatabase } from "@ai-webmail/db/client";
import { authSessions, users } from "@ai-webmail/db/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { writeAuditEvent } from "./audit";
import { hashToken, newCsrfToken } from "./csrf";

export const idleSessionMs = 12 * 60 * 60 * 1000;
export const absoluteSessionMs = 7 * 24 * 60 * 60 * 1000;

type SessionWriter = Pick<WebmailDatabase, "transaction">;

export class InactiveUserError extends Error {
	constructor() {
		super("An active account is required to create a session.");
	}
}

export function sessionDeviceLabel(userAgent: string | null) {
	const agent = userAgent?.slice(0, 1024) ?? "";
	const browser = /Edg\//.test(agent)
		? "Edge"
		: /Firefox\//.test(agent)
			? "Firefox"
			: /Chrome\//.test(agent)
				? "Chrome"
				: /Safari\//.test(agent)
					? "Safari"
					: "Browser";
	const platform = /iPhone|iPad/.test(agent)
		? "iOS/iPadOS"
		: /Android/.test(agent)
			? "Android"
			: /Windows/.test(agent)
				? "Windows"
				: /Macintosh/.test(agent)
					? "macOS"
					: /Linux/.test(agent)
						? "Linux"
						: undefined;
	return platform ? `${browser} on ${platform}` : `${browser} session`;
}

export async function createSession(
	db: SessionWriter,
	userId: string,
	now = new Date(),
	options: {
		method?: "password" | "passkey" | "recovery";
		deviceLabel?: string;
	} = {},
) {
	const sessionToken = randomBytes(32).toString("base64url");
	const csrfToken = newCsrfToken();
	const absoluteExpiresAt = new Date(now.getTime() + absoluteSessionMs);

	const id = await db.transaction(async (transaction) => {
		const [user] = await transaction
			.select({ id: users.id })
			.from(users)
			.where(and(eq(users.id, userId), eq(users.status, "active")))
			.for("update");
		if (!user) {
			throw new InactiveUserError();
		}
		const [session] = await transaction
			.insert(authSessions)
			.values({
				userId,
				tokenHash: hashToken(sessionToken),
				csrfTokenHash: hashToken(csrfToken),
				createdAt: now,
				lastSeenAt: now,
				lastAuthenticatedAt: now,
				idleExpiresAt: new Date(now.getTime() + idleSessionMs),
				absoluteExpiresAt,
				authenticationMethod: options.method ?? "password",
				deviceLabel: options.deviceLabel ?? "Browser session",
			})
			.returning({ id: authSessions.id });
		await writeAuditEvent(transaction, {
			actorUserId: userId,
			actorSessionId: session.id,
			action: "session.created",
			targetId: session.id,
			createdAt: now,
		});
		return session.id;
	});

	return { id, sessionToken, csrfToken, absoluteExpiresAt };
}

export async function getActiveSession(
	db: Pick<WebmailDatabase, "select" | "update">,
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
	await db.transaction(async (transaction) => {
		const [session] = await transaction
			.update(authSessions)
			.set({ revokedAt: now })
			.where(
				and(
					eq(authSessions.tokenHash, hashToken(sessionToken)),
					isNull(authSessions.revokedAt),
				),
			)
			.returning({ id: authSessions.id, userId: authSessions.userId });
		if (session) {
			await writeAuditEvent(transaction, {
				actorUserId: session.userId,
				actorSessionId: session.id,
				action: "session.revoked",
				targetId: session.id,
				createdAt: now,
			});
		}
	});
}
