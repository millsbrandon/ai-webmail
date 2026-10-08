import { timingSafeEqual } from "node:crypto";
import type { WebmailDatabase } from "@ai-webmail/db/client";
import { passkeyChallenges, passkeys, users } from "@ai-webmail/db/schema";
import {
	type AuthenticationResponseJSON,
	generateAuthenticationOptions,
	generateRegistrationOptions,
	type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { and, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";
import { hashToken } from "./csrf";

export const passkeyChallengeLifetimeMs = 5 * 60 * 1000;
export const recentAuthenticationLifetimeMs = 5 * 60 * 1000;
const relyingPartyName = "AI Webmail";

export function getWebAuthnConfig(
	configuredOrigin = process.env.APP_ORIGIN,
	environment = process.env.NODE_ENV,
) {
	if (!configuredOrigin) {
		throw new Error(
			"APP_ORIGIN must be configured for passkey authentication.",
		);
	}

	const url = new URL(configuredOrigin);
	if (
		url.origin !== configuredOrigin.replace(/\/$/, "") ||
		url.username ||
		url.password ||
		(url.protocol !== "https:" &&
			!(
				environment !== "production" &&
				url.protocol === "http:" &&
				url.hostname === "localhost"
			)) ||
		!url.hostname
	) {
		throw new Error(
			"APP_ORIGIN must be an exact HTTPS origin (HTTP localhost is allowed in development).",
		);
	}

	return {
		expectedOrigin: url.origin,
		rpID: url.hostname,
		rpName: relyingPartyName,
	};
}

async function removeOldChallenges(db: WebmailDatabase, now = new Date()) {
	await db
		.delete(passkeyChallenges)
		.where(
			or(
				lt(passkeyChallenges.expiresAt, now),
				isNotNull(passkeyChallenges.consumedAt),
			),
		);
}

export async function createRegistrationOptions(
	db: WebmailDatabase,
	userId: string,
	sessionId: string,
) {
	await removeOldChallenges(db);
	const [user] = await db
		.select({
			id: users.id,
			userHandle: users.userHandle,
			email: users.email,
			displayName: users.displayName,
		})
		.from(users)
		.where(and(eq(users.id, userId), eq(users.status, "active")))
		.limit(1);

	if (!user) {
		throw new Error("An active user is required to register a passkey.");
	}

	const existingPasskeys = await db
		.select({
			id: passkeys.credentialId,
			transports: passkeys.transports,
		})
		.from(passkeys)
		.where(eq(passkeys.userId, userId));
	const config = getWebAuthnConfig();
	const options = await generateRegistrationOptions({
		rpID: config.rpID,
		rpName: config.rpName,
		userID: Buffer.from(user.userHandle, "base64url"),
		userName: user.email,
		userDisplayName: user.displayName,
		attestationType: "none",
		authenticatorSelection: {
			residentKey: "required",
			userVerification: "required",
		},
		excludeCredentials: existingPasskeys,
	});
	const createdAt = new Date();
	const expiresAt = new Date(createdAt.getTime() + passkeyChallengeLifetimeMs);
	const [challenge] = await db
		.insert(passkeyChallenges)
		.values({
			challengeHash: hashToken(options.challenge),
			purpose: "registration",
			userId,
			sessionId,
			createdAt,
			expiresAt,
		})
		.returning({ id: passkeyChallenges.id });

	return { challengeId: challenge.id, options };
}

export async function createAuthenticationOptions(db: WebmailDatabase) {
	await removeOldChallenges(db);
	const config = getWebAuthnConfig();
	const options = await generateAuthenticationOptions({
		rpID: config.rpID,
		userVerification: "required",
	});
	const createdAt = new Date();
	const [challenge] = await db
		.insert(passkeyChallenges)
		.values({
			challengeHash: hashToken(options.challenge),
			purpose: "authentication",
			createdAt,
			expiresAt: new Date(createdAt.getTime() + passkeyChallengeLifetimeMs),
		})
		.returning({ id: passkeyChallenges.id });

	return { challengeId: challenge.id, options };
}

export async function consumePasskeyChallenge(
	db: WebmailDatabase,
	challengeId: string,
	purpose: "authentication" | "registration",
	context: { userId: string; sessionId: string } | undefined,
	now = new Date(),
) {
	const conditions = [
		eq(passkeyChallenges.id, challengeId),
		eq(passkeyChallenges.purpose, purpose),
		isNull(passkeyChallenges.consumedAt),
		gt(passkeyChallenges.expiresAt, now),
	];
	if (context) {
		conditions.push(
			eq(passkeyChallenges.userId, context.userId),
			eq(passkeyChallenges.sessionId, context.sessionId),
		);
	} else {
		conditions.push(
			isNull(passkeyChallenges.userId),
			isNull(passkeyChallenges.sessionId),
		);
	}

	const [challenge] = await db
		.update(passkeyChallenges)
		.set({ consumedAt: now })
		.where(and(...conditions))
		.returning({ challengeHash: passkeyChallenges.challengeHash });

	return challenge;
}

export function challengeMatchesHash(challengeHash: string) {
	return async (candidate: string) => {
		const candidateHash = Buffer.from(hashToken(candidate), "hex");
		const storedHash = Buffer.from(challengeHash, "hex");
		return (
			candidateHash.length === storedHash.length &&
			timingSafeEqual(candidateHash, storedHash)
		);
	};
}

export function isRecentAuthentication(
	lastAuthenticatedAt: Date,
	now = new Date(),
) {
	const age = now.getTime() - lastAuthenticatedAt.getTime();
	return age >= 0 && age <= recentAuthenticationLifetimeMs;
}

export async function findPasskeyForAuthentication(
	db: WebmailDatabase,
	credentialId: string,
) {
	const [credential] = await db
		.select({
			credentialId: passkeys.credentialId,
			userId: users.id,
			userHandle: users.userHandle,
			email: users.email,
			displayName: users.displayName,
			status: users.status,
			publicKey: passkeys.publicKey,
			counter: passkeys.counter,
			transports: passkeys.transports,
		})
		.from(passkeys)
		.innerJoin(users, eq(passkeys.userId, users.id))
		.where(eq(passkeys.credentialId, credentialId))
		.limit(1);

	return credential;
}

export function isRegistrationResponse(
	value: unknown,
): value is RegistrationResponseJSON {
	if (!value || typeof value !== "object") {
		return false;
	}
	const response = value as Record<string, unknown>;
	return (
		response.type === "public-key" &&
		typeof response.id === "string" &&
		response.id.length > 0 &&
		response.id.length <= 2048 &&
		typeof response.rawId === "string" &&
		response.rawId === response.id &&
		!!response.response &&
		typeof response.response === "object"
	);
}

export function isAuthenticationResponse(
	value: unknown,
): value is AuthenticationResponseJSON {
	if (!value || typeof value !== "object") {
		return false;
	}
	const response = value as Record<string, unknown>;
	return (
		response.type === "public-key" &&
		typeof response.id === "string" &&
		response.id.length > 0 &&
		response.id.length <= 2048 &&
		typeof response.rawId === "string" &&
		response.rawId === response.id &&
		!!response.response &&
		typeof response.response === "object"
	);
}

export function matchesUserHandle(
	response: AuthenticationResponseJSON,
	expectedUserHandle: string,
) {
	return response.response.userHandle === expectedUserHandle;
}
