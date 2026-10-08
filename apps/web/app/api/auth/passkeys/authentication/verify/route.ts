import { passkeys } from "@ai-webmail/db/schema";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { hasValidCsrf, hasValidOrigin } from "../../../../../../lib/auth/csrf";
import {
	challengeMatchesHash,
	consumePasskeyChallenge,
	findPasskeyForAuthentication,
	getWebAuthnConfig,
	isAuthenticationResponse,
	matchesUserHandle,
} from "../../../../../../lib/auth/passkeys";
import { readBoundedJsonBody } from "../../../../../../lib/auth/request-body";
import { setSessionCookies } from "../../../../../../lib/auth/session-cookies";
import { createSession } from "../../../../../../lib/auth/sessions";
import { getDatabase } from "../../../../../../lib/database";

export const runtime = "nodejs";

const invalidCredentials = { error: "Passkey could not be verified." };
const challengeIdPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
	if (!hasValidOrigin(request) || !hasValidCsrf(request)) {
		return NextResponse.json(
			{ error: "Request could not be verified." },
			{ status: 403, headers: { "Cache-Control": "no-store" } },
		);
	}

	const parsed = await readBoundedJsonBody(request, 32 * 1024);
	if (
		!parsed.ok ||
		typeof parsed.value.challengeId !== "string" ||
		!challengeIdPattern.test(parsed.value.challengeId) ||
		!isAuthenticationResponse(parsed.value.response)
	) {
		return NextResponse.json(invalidCredentials, {
			status: 401,
			headers: { "Cache-Control": "no-store" },
		});
	}

	try {
		const db = getDatabase().db;
		const challenge = await consumePasskeyChallenge(
			db,
			parsed.value.challengeId,
			"authentication",
			undefined,
		);
		if (!challenge) {
			return NextResponse.json(invalidCredentials, {
				status: 401,
				headers: { "Cache-Control": "no-store" },
			});
		}

		const credential = await findPasskeyForAuthentication(
			db,
			parsed.value.response.id,
		);
		if (
			credential?.status !== "active" ||
			!matchesUserHandle(parsed.value.response, credential.userHandle)
		) {
			return NextResponse.json(invalidCredentials, {
				status: 401,
				headers: { "Cache-Control": "no-store" },
			});
		}

		let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
		try {
			const config = getWebAuthnConfig();
			verification = await verifyAuthenticationResponse({
				response: parsed.value.response,
				expectedChallenge: challengeMatchesHash(challenge.challengeHash),
				expectedOrigin: config.expectedOrigin,
				expectedRPID: config.rpID,
				requireUserVerification: true,
				credential: {
					id: credential.credentialId,
					publicKey: Buffer.from(credential.publicKey, "base64url"),
					counter: credential.counter,
					transports: credential.transports,
				},
			});
		} catch {
			return NextResponse.json(invalidCredentials, {
				status: 401,
				headers: { "Cache-Control": "no-store" },
			});
		}

		if (
			!verification.verified ||
			verification.authenticationInfo.credentialID !== credential.credentialId
		) {
			return NextResponse.json(invalidCredentials, {
				status: 401,
				headers: { "Cache-Control": "no-store" },
			});
		}

		const authenticated = await db.transaction(async (transaction) => {
			const [updated] = await transaction
				.update(passkeys)
				.set({
					counter: verification.authenticationInfo.newCounter,
					deviceType: verification.authenticationInfo.credentialDeviceType,
					backedUp: verification.authenticationInfo.credentialBackedUp,
					lastUsedAt: new Date(),
				})
				.where(
					and(
						eq(passkeys.credentialId, credential.credentialId),
						eq(passkeys.counter, credential.counter),
					),
				)
				.returning({ credentialId: passkeys.credentialId });

			if (!updated) {
				return undefined;
			}

			const session = await createSession(transaction, credential.userId);
			return { session };
		});

		if (!authenticated) {
			return NextResponse.json(invalidCredentials, {
				status: 401,
				headers: { "Cache-Control": "no-store" },
			});
		}

		const response = NextResponse.json(
			{
				status: "authenticated",
				csrfToken: authenticated.session.csrfToken,
				user: {
					email: credential.email,
					displayName: credential.displayName,
				},
			},
			{ headers: { "Cache-Control": "no-store" } },
		);
		return setSessionCookies(response, authenticated.session);
	} catch (error) {
		console.error("Passkey authentication failed unexpectedly.", error);
		return NextResponse.json(
			{ error: "Passkey sign-in is temporarily unavailable." },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
}
