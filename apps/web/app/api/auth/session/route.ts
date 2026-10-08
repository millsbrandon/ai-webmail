import { type NextRequest, NextResponse } from "next/server";
import { cookieValue, sessionCookieName } from "../../../../lib/auth/csrf";
import { getActiveSession } from "../../../../lib/auth/sessions";
import { getDatabase } from "../../../../lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	const sessionToken = cookieValue(request, sessionCookieName);
	if (!sessionToken) {
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401, headers: { "Cache-Control": "no-store" } },
		);
	}

	try {
		const session = await getActiveSession(getDatabase().db, sessionToken);
		if (!session) {
			return NextResponse.json(
				{ error: "Authentication required." },
				{ status: 401, headers: { "Cache-Control": "no-store" } },
			);
		}

		return NextResponse.json(
			{
				status: "authenticated",
				user: { email: session.email, displayName: session.displayName },
			},
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		console.error("Session lookup failed unexpectedly.", error);
		return NextResponse.json(
			{ error: "Session verification is temporarily unavailable." },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
}
