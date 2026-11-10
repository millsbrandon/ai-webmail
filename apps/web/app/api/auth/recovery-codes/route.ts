import { type NextRequest, NextResponse } from "next/server";
import {
	cookieValue,
	hasValidCsrf,
	hasValidOrigin,
	sessionCookieName,
} from "../../../../lib/auth/csrf";
import { isRecentAuthentication } from "../../../../lib/auth/passkeys";
import { replaceRecoveryCodes } from "../../../../lib/auth/recovery-codes";
import {
	requireRecentSession,
	SessionManagementError,
} from "../../../../lib/auth/session-management";
import { getActiveSession } from "../../../../lib/auth/sessions";
import { getDatabase } from "../../../../lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
				{ error: "Sign out and sign in again before managing recovery codes." },
				{ status: 403, headers: { "Cache-Control": "no-store" } },
			);
		}

		const codes = await db.transaction(async (transaction) => {
			const current = await requireRecentSession(transaction, sessionToken);
			return replaceRecoveryCodes(
				transaction,
				current.userId,
				new Date(),
				current.id,
			);
		});
		return NextResponse.json(
			{ status: "recovery_codes_created", codes },
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		if (error instanceof SessionManagementError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status, headers: { "Cache-Control": "no-store" } },
			);
		}
		console.error("Recovery code rotation failed unexpectedly.", error);
		return NextResponse.json(
			{ error: "Recovery codes are temporarily unavailable." },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
}
