import type { WebmailDatabase } from "@ai-webmail/db/client";
import {
	authSessions,
	organizationMemberships,
	users,
} from "@ai-webmail/db/schema";
import { and, eq, gt, inArray, isNull, ne } from "drizzle-orm";
import { writeAuditEvent } from "./audit";
import { hashToken } from "./csrf";
import { isRecentAuthentication } from "./passkeys";
import { getActiveSession } from "./sessions";

export class SessionManagementError extends Error {
	constructor(
		public status: 401 | 403 | 404 | 409,
		message: string,
	) {
		super(message);
	}
}

type Transaction = Parameters<Parameters<WebmailDatabase["transaction"]>[0]>[0];

export async function requireRecentSession(
	transaction: Transaction,
	token: string,
	now = new Date(),
) {
	const [actor] = await transaction
		.select({ userId: authSessions.userId })
		.from(authSessions)
		.where(eq(authSessions.tokenHash, hashToken(token)))
		.limit(1);
	if (!actor) {
		throw new SessionManagementError(401, "Authentication required.");
	}
	await transaction
		.select({ id: users.id })
		.from(users)
		.where(eq(users.id, actor.userId))
		.for("update");
	const session = await getActiveSession(transaction, token, now);
	if (!session) {
		throw new SessionManagementError(401, "Authentication required.");
	}
	if (!isRecentAuthentication(session.lastAuthenticatedAt, now)) {
		throw new SessionManagementError(
			403,
			"Sign out and sign in again before managing sessions or accounts.",
		);
	}
	return session;
}

export async function listUserSessions(
	db: WebmailDatabase,
	userId: string,
	currentSessionId: string,
	now = new Date(),
) {
	const sessions = await db
		.select({
			id: authSessions.id,
			deviceLabel: authSessions.deviceLabel,
			authenticationMethod: authSessions.authenticationMethod,
			createdAt: authSessions.createdAt,
			lastSeenAt: authSessions.lastSeenAt,
			absoluteExpiresAt: authSessions.absoluteExpiresAt,
		})
		.from(authSessions)
		.where(
			and(
				eq(authSessions.userId, userId),
				isNull(authSessions.revokedAt),
				gt(authSessions.idleExpiresAt, now),
				gt(authSessions.absoluteExpiresAt, now),
			),
		)
		.orderBy(authSessions.createdAt, authSessions.id);
	return sessions.map((session) => ({
		...session,
		current: session.id === currentSessionId,
	}));
}

export async function revokeUserSessions(
	db: WebmailDatabase,
	token: string,
	targetSessionId?: string,
	now = new Date(),
) {
	return db.transaction(async (transaction) => {
		const session = await requireRecentSession(transaction, token, now);
		const revoked = await transaction
			.update(authSessions)
			.set({ revokedAt: now })
			.where(
				and(
					eq(authSessions.userId, session.userId),
					isNull(authSessions.revokedAt),
					targetSessionId === undefined
						? ne(authSessions.id, session.id)
						: eq(authSessions.id, targetSessionId),
				),
			)
			.returning({ id: authSessions.id });
		if (targetSessionId !== undefined && revoked.length === 0) {
			throw new SessionManagementError(404, "Session not found.");
		}
		await writeAuditEvent(transaction, {
			actorUserId: session.userId,
			actorSessionId: session.id,
			action:
				targetSessionId === undefined
					? "sessions.revoked_others"
					: "session.revoked",
			targetId: targetSessionId ?? session.userId,
			createdAt: now,
		});
		return { revokedCount: revoked.length };
	});
}

export async function disableOrganizationUser(
	db: WebmailDatabase,
	token: string,
	organizationId: string,
	targetUserId: string,
	now = new Date(),
) {
	await db.transaction(async (transaction) => {
		const [actor] = await transaction
			.select({ userId: authSessions.userId })
			.from(authSessions)
			.where(eq(authSessions.tokenHash, hashToken(token)))
			.limit(1);
		if (!actor) {
			throw new SessionManagementError(401, "Authentication required.");
		}
		// Match session creation's user-row lock so disable cannot race a fresh login.
		await transaction
			.select({ id: users.id })
			.from(users)
			.where(inArray(users.id, [actor.userId, targetUserId]))
			.orderBy(users.id)
			.for("update");
		const session = await requireRecentSession(transaction, token, now);
		const [owner] = await transaction
			.select({ userId: organizationMemberships.userId })
			.from(organizationMemberships)
			.where(
				and(
					eq(organizationMemberships.organizationId, organizationId),
					eq(organizationMemberships.userId, session.userId),
					eq(organizationMemberships.role, "owner"),
				),
			)
			.for("update");
		if (!owner) {
			throw new SessionManagementError(
				403,
				"Account administration is not permitted.",
			);
		}
		const memberships = await transaction
			.select({
				organizationId: organizationMemberships.organizationId,
				role: organizationMemberships.role,
			})
			.from(organizationMemberships)
			.where(eq(organizationMemberships.userId, targetUserId))
			.for("update");
		if (
			!memberships.some(
				(membership) => membership.organizationId === organizationId,
			)
		) {
			throw new SessionManagementError(404, "Account not found.");
		}
		if (
			targetUserId === session.userId ||
			memberships.some((membership) => membership.role === "owner") ||
			memberships.length !== 1
		) {
			throw new SessionManagementError(
				409,
				"Owner and multi-organization accounts cannot be disabled here.",
			);
		}
		await transaction
			.update(users)
			.set({ status: "disabled", updatedAt: now })
			.where(eq(users.id, targetUserId));
		await transaction
			.update(authSessions)
			.set({ revokedAt: now })
			.where(
				and(
					eq(authSessions.userId, targetUserId),
					isNull(authSessions.revokedAt),
				),
			);
		await writeAuditEvent(transaction, {
			actorUserId: session.userId,
			actorSessionId: session.id,
			organizationId,
			action: "user.disabled",
			targetId: targetUserId,
			createdAt: now,
		});
	});
}
