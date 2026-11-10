import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "../database";
import {
	cookieValue,
	hasValidCsrf,
	hasValidOrigin,
	sessionCookieName,
} from "./csrf";
import {
	disableOrganizationUser,
	listUserSessions,
	revokeUserSessions,
	SessionManagementError,
} from "./session-management";
import { getActiveSession } from "./sessions";

type Action =
	| { kind: "list" }
	| { kind: "revoke"; sessionId?: string }
	| { kind: "disable"; organizationId: string; userId: string };
const headers = { "Cache-Control": "no-store" };
const uuidPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function sessionManagementResponse(
	request: NextRequest,
	action: Action,
) {
	if (action.kind !== "list" && !hasValidOrigin(request)) {
		return NextResponse.json(
			{ error: "Request could not be verified." },
			{ status: 403, headers },
		);
	}
	const token = cookieValue(request, sessionCookieName);
	if (!token) {
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401, headers },
		);
	}
	try {
		const db = getDatabase().db;
		const session = await getActiveSession(db, token);
		if (!session) {
			return NextResponse.json(
				{ error: "Authentication required." },
				{ status: 401, headers },
			);
		}
		if (action.kind === "list") {
			return NextResponse.json(
				{ sessions: await listUserSessions(db, session.userId, session.id) },
				{ headers },
			);
		}
		if (!hasValidCsrf(request, session.csrfTokenHash)) {
			return NextResponse.json(
				{ error: "Request could not be verified." },
				{ status: 403, headers },
			);
		}
		if (action.kind === "disable") {
			if (
				!uuidPattern.test(action.organizationId) ||
				!uuidPattern.test(action.userId)
			) {
				return NextResponse.json(
					{ error: "Account not found." },
					{ status: 404, headers },
				);
			}
			await disableOrganizationUser(
				db,
				token,
				action.organizationId,
				action.userId,
			);
			return NextResponse.json({ status: "account_disabled" }, { headers });
		}
		if (action.sessionId !== undefined && !uuidPattern.test(action.sessionId)) {
			return NextResponse.json(
				{ error: "Session not found." },
				{ status: 404, headers },
			);
		}
		const result = await revokeUserSessions(db, token, action.sessionId);
		return NextResponse.json(
			{ status: "sessions_revoked", ...result },
			{ headers },
		);
	} catch (error) {
		if (error instanceof SessionManagementError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status, headers },
			);
		}
		console.error("Session management failed unexpectedly.", error);
		return NextResponse.json(
			{ error: "Session management is temporarily unavailable." },
			{ status: 503, headers },
		);
	}
}
