import { createHash } from "node:crypto";
import type { WebmailDatabase } from "@ai-webmail/db/client";
import { loginAttempts, users } from "@ai-webmail/db/schema";
import { and, eq, gt, sql } from "drizzle-orm";
import { isValidEmail, normalizeEmail } from "./invitations";
import {
	validatePassword,
	verifyPassword,
	verifyUnknownAccountPassword,
} from "./password";
import { createSession } from "./sessions";

const attemptWindowMs = 15 * 60 * 1000;
const attemptLimit = 5;
const lockoutMs = 15 * 60 * 1000;

function accountKey(email: string) {
	return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

export async function authenticate(
	db: WebmailDatabase,
	emailInput: string,
	password: string,
	now = new Date(),
) {
	const email = normalizeEmail(emailInput);
	const key = accountKey(email);
	const [attempt] = await db
		.select({ lockedUntil: loginAttempts.lockedUntil })
		.from(loginAttempts)
		.where(
			and(
				eq(loginAttempts.accountHash, key),
				gt(loginAttempts.lockedUntil, now),
			),
		)
		.limit(1);

	if (attempt) {
		await verifyUnknownAccountPassword(password);
		return undefined;
	}

	const [user] = isValidEmail(email)
		? await db.select().from(users).where(eq(users.email, email)).limit(1)
		: [];

	const usablePassword = validatePassword(password);
	const passwordMatches =
		user?.status === "active" && usablePassword
			? await verifyPassword(password, user.passwordHash)
			: await verifyUnknownAccountPassword(password);

	if (user?.status !== "active" || !passwordMatches) {
		await recordFailure(db, key, now);
		return undefined;
	}

	await db.delete(loginAttempts).where(eq(loginAttempts.accountHash, key));
	const session = await createSession(db, user.id, now);

	return {
		user: { id: user.id, email: user.email, displayName: user.displayName },
		session,
	};
}

async function recordFailure(db: WebmailDatabase, key: string, now: Date) {
	const windowCutoff = new Date(now.getTime() - attemptWindowMs);
	const lockUntil = new Date(now.getTime() + lockoutMs);

	await db
		.insert(loginAttempts)
		.values({
			accountHash: key,
			failedAttempts: 1,
			windowStartedAt: now,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			target: loginAttempts.accountHash,
			set: {
				failedAttempts: sql`CASE WHEN ${loginAttempts.windowStartedAt} <= ${windowCutoff} THEN 1 ELSE ${loginAttempts.failedAttempts} + 1 END`,
				windowStartedAt: sql`CASE WHEN ${loginAttempts.windowStartedAt} <= ${windowCutoff} THEN ${now} ELSE ${loginAttempts.windowStartedAt} END`,
				lockedUntil: sql`CASE WHEN ${loginAttempts.windowStartedAt} <= ${windowCutoff} THEN NULL WHEN ${loginAttempts.failedAttempts} + 1 >= ${attemptLimit} THEN ${lockUntil} ELSE ${loginAttempts.lockedUntil} END`,
				updatedAt: now,
			},
		});
}

export const loginPolicy = {
	attemptLimit,
	attemptWindowMs,
	lockoutMs,
} as const;
