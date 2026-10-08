import { type NextRequest, NextResponse } from "next/server";
import {
	cookieValue,
	csrfCookieName,
	hasValidCsrf,
	hasValidOrigin,
	sessionCookieName,
} from "../../../../lib/auth/csrf";
import { getActiveSession, revokeSession } from "../../../../lib/auth/sessions";
import { getDatabase } from "../../../../lib/database";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	if (!hasValidOrigin(request)) {
		return NextResponse.json(
			{ error: "Request could not be verified." },
			{ status: 403, headers: { "Cache-Control": "no-store" } },
		);
	}

	const sessionToken = cookieValue(request, sessionCookieName);

	try {
		const database = getDatabase().db;
		const activeSession = sessionToken
			? await getActiveSession(database, sessionToken)
			: undefined;

		if (!hasValidCsrf(request, activeSession?.csrfTokenHash)) {
			return NextResponse.json(
				{ error: "Request could not be verified." },
				{ status: 403, headers: { "Cache-Control": "no-store" } },
			);
		}

		if (sessionToken) {
			await revokeSession(database, sessionToken);
		}

		const response = NextResponse.json(
			{ status: "signed_out" },
			{ headers: { "Cache-Control": "no-store" } },
		);
		for (const name of [sessionCookieName, csrfCookieName]) {
			response.cookies.set(name, "", {
				expires: new Date(0),
				httpOnly: name === sessionCookieName,
				path: "/",
				sameSite: name === sessionCookieName ? "lax" : "strict",
				secure: true,
			});
		}

		return response;
	} catch (error) {
		console.error("Session logout failed unexpectedly.", error);
		return NextResponse.json(
			{ error: "Sign-out is temporarily unavailable." },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
}
