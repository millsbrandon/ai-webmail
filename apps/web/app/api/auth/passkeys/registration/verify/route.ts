import { passkeys } from "@ai-webmail/db/schema";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { type NextRequest, NextResponse } from "next/server";
import {
	cookieValue,
	hasValidCsrf,
	hasValidOrigin,
	sessionCookieName,
} from "../../../../../../lib/auth/csrf";
import {
	challengeMatchesHash,
	consumePasskeyChallenge,
	getWebAuthnConfig,
	isRecentAuthentication,
	isRegistrationResponse,
} from "../../../../../../lib/auth/passkeys";
import { readBoundedJsonBody } from "../../../../../../lib/auth/request-body";
import { getActiveSession } from "../../../../../../lib/auth/sessions";
import { getDatabase } from "../../../../../../lib/database";

export const runtime = "nodejs";

const invalidResponse = {
	error: "Passkey registration could not be verified.",
};
const challengeIdPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
	if (!hasValidOrigin(request)) {
		return NextResponse.json(
			{ error: "Request could not be verified." },
			{ status: 403, headers: { "Cache-Control": "no-store" } },
		);
	}

	const sessionToken = cookieValue(request, sessionCookieName);
	if (!sessionToken) {
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401, headers: { "Cache-Control": "no-store" } },
		);
	}

	try {
		const db = getDatabase().db;
		const session = await getActiveSession(db, sessionToken);
		if (!session) {
			return NextResponse.json(
				{ error: "Authentication required." },
				{ status: 401, headers: { "Cache-Control": "no-store" } },
			);
		}
		if (!hasValidCsrf(request, session.csrfTokenHash)) {
			return NextResponse.json(
				{ error: "Request could not be verified." },
				{ status: 403, headers: { "Cache-Control": "no-store" } },
			);
		}
		if (!isRecentAuthentication(session.lastAuthenticatedAt)) {
			return NextResponse.json(
				{ error: "Sign out and sign in again before managing passkeys." },
				{ status: 403, headers: { "Cache-Control": "no-store" } },
			);
		}

		const parsed = await readBoundedJsonBody(request, 32 * 1024);
		if (
			!parsed.ok ||
			typeof parsed.value.challengeId !== "string" ||
			!challengeIdPattern.test(parsed.value.challengeId) ||
			!isRegistrationResponse(parsed.value.response) ||
			typeof parsed.value.name !== "string" ||
			parsed.value.name.trim().length < 1 ||
			parsed.value.name.trim().length > 80
		) {
			return NextResponse.json(invalidResponse, {
				status: 400,
				headers: { "Cache-Control": "no-store" },
			});
		}

		const challenge = await consumePasskeyChallenge(
			db,
			parsed.value.challengeId,
			"registration",
			{ userId: session.userId, sessionId: session.id },
		);
		if (!challenge) {
			return NextResponse.json(invalidResponse, {
				status: 400,
				headers: { "Cache-Control": "no-store" },
			});
		}

		let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
		try {
			const config = getWebAuthnConfig();
			verification = await verifyRegistrationResponse({
				response: parsed.value.response,
				expectedChallenge: challengeMatchesHash(challenge.challengeHash),
				expectedOrigin: config.expectedOrigin,
				expectedRPID: config.rpID,
				requireUserVerification: true,
			});
		} catch {
			return NextResponse.json(invalidResponse, {
				status: 400,
				headers: { "Cache-Control": "no-store" },
			});
		}

		const registrationInfo = verification.registrationInfo;
		if (!verification.verified || !registrationInfo) {
			return NextResponse.json(invalidResponse, {
				status: 400,
				headers: { "Cache-Control": "no-store" },
			});
		}
		if (registrationInfo.credential.id !== parsed.value.response.id) {
			return NextResponse.json(invalidResponse, {
				status: 400,
				headers: { "Cache-Control": "no-store" },
			});
		}

		await db.insert(passkeys).values({
			credentialId: registrationInfo.credential.id,
			userId: session.userId,
			publicKey: Buffer.from(registrationInfo.credential.publicKey).toString(
				"base64url",
			),
			counter: registrationInfo.credential.counter,
			transports: registrationInfo.credential.transports ?? [],
			deviceType: registrationInfo.credentialDeviceType,
			backedUp: registrationInfo.credentialBackedUp,
			name: parsed.value.name.trim(),
		});

		return NextResponse.json(
			{ status: "passkey_registered" },
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		console.error(
			"Passkey registration verification failed unexpectedly.",
			error,
		);
		return NextResponse.json(
			{ error: "Passkey registration is temporarily unavailable." },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
}
