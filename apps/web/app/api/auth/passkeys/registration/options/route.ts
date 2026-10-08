import { type NextRequest, NextResponse } from "next/server";
import {
	cookieValue,
	hasValidCsrf,
	hasValidOrigin,
	sessionCookieName,
} from "../../../../../../lib/auth/csrf";
import {
	createRegistrationOptions,
	isRecentAuthentication,
} from "../../../../../../lib/auth/passkeys";
import { getActiveSession } from "../../../../../../lib/auth/sessions";
import { getDatabase } from "../../../../../../lib/database";

export const runtime = "nodejs";

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

		const result = await createRegistrationOptions(
			db,
			session.userId,
			session.id,
		);
		return NextResponse.json(result, {
			headers: { "Cache-Control": "no-store" },
		});
	} catch (error) {
		console.error("Passkey registration options failed unexpectedly.", error);
		return NextResponse.json(
			{ error: "Passkey registration is temporarily unavailable." },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
}
