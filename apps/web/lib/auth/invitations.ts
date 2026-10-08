import { randomBytes } from "node:crypto";
import type { WebmailDatabase } from "@ai-webmail/db/client";
import { invitations, users } from "@ai-webmail/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { hashToken } from "./csrf";
import { hashPassword, validatePassword } from "./password";

export const invitationLifetimeMs = 24 * 60 * 60 * 1000;

export function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
	return (
		email.length <= 254 &&
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
		!email.includes("..")
	);
}

export async function createInvitation(
	db: WebmailDatabase,
	emailInput: string,
	createdBy: string | null,
	now = new Date(),
) {
	const email = normalizeEmail(emailInput);
	if (!isValidEmail(email)) {
		throw new Error("A valid email address is required.");
	}

	const token = randomBytes(32).toString("base64url");
	await db.insert(invitations).values({
		email,
		tokenHash: hashToken(token),
		createdBy,
		createdAt: now,
		expiresAt: new Date(now.getTime() + invitationLifetimeMs),
	});

	return { token, expiresAt: new Date(now.getTime() + invitationLifetimeMs) };
}

export async function acceptInvitation(
	db: WebmailDatabase,
	token: string,
	emailInput: string,
	displayNameInput: string,
	password: string,
	now = new Date(),
) {
	const email = normalizeEmail(emailInput);
	const displayName = displayNameInput.trim();
	if (
		!/^[\w-]{43}$/.test(token) ||
		!isValidEmail(email) ||
		displayName.length < 1 ||
		displayName.length > 100
	) {
		return false;
	}

	if (!validatePassword(password)) {
		return false;
	}

	const tokenHash = hashToken(token);
	const [pendingInvitation] = await db
		.select({ id: invitations.id })
		.from(invitations)
		.where(
			and(
				eq(invitations.tokenHash, tokenHash),
				eq(invitations.email, email),
				isNull(invitations.acceptedAt),
				gt(invitations.expiresAt, now),
			),
		)
		.limit(1);

	if (!pendingInvitation) {
		return false;
	}

	const passwordHash = await hashPassword(password);

	return db.transaction(async (transaction) => {
		const [invitation] = await transaction
			.select()
			.from(invitations)
			.where(
				and(
					eq(invitations.tokenHash, tokenHash),
					eq(invitations.email, email),
					isNull(invitations.acceptedAt),
					gt(invitations.expiresAt, now),
				),
			)
			.for("update")
			.limit(1);

		if (!invitation) {
			return false;
		}

		const [existing] = await transaction
			.select({ id: users.id })
			.from(users)
			.where(eq(users.email, invitation.email))
			.limit(1);

		if (existing) {
			return false;
		}

		await transaction.insert(users).values({
			email: invitation.email,
			displayName,
			passwordHash,
			status: "active",
		});

		await transaction
			.update(invitations)
			.set({ acceptedAt: now })
			.where(eq(invitations.id, invitation.id));

		return true;
	});
}
