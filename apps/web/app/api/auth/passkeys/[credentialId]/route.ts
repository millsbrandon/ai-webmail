import { passkeys } from "@ai-webmail/db/schema";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import {
	cookieValue,
	hasValidCsrf,
	hasValidOrigin,
	sessionCookieName,
} from "../../../../../lib/auth/csrf";
import { isRecentAuthentication } from "../../../../../lib/auth/passkeys";
import { getActiveSession } from "../../../../../lib/auth/sessions";
import { getDatabase } from "../../../../../lib/database";

export const runtime = "nodejs";

const credentialIdPattern = /^[\w-]{1,2048}$/;

export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ credentialId: string }> },
) {
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

		const { credentialId } = await context.params;
		if (!credentialIdPattern.test(credentialId)) {
			return NextResponse.json(
				{ error: "Passkey was not found." },
				{ status: 404, headers: { "Cache-Control": "no-store" } },
			);
		}

		const [removed] = await db
			.delete(passkeys)
			.where(
				and(
					eq(passkeys.credentialId, credentialId),
					eq(passkeys.userId, session.userId),
				),
			)
			.returning({ credentialId: passkeys.credentialId });
		if (!removed) {
			return NextResponse.json(
				{ error: "Passkey was not found." },
				{ status: 404, headers: { "Cache-Control": "no-store" } },
			);
		}

		return NextResponse.json(
			{ status: "passkey_removed" },
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		console.error("Passkey removal failed unexpectedly.", error);
		return NextResponse.json(
			{ error: "Passkey removal is temporarily unavailable." },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
}
