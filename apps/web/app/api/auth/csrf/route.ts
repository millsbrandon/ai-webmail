import { type NextRequest, NextResponse } from "next/server";
import {
	cookieValue,
	csrfCookieName,
	newCsrfToken,
} from "../../../../lib/auth/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	const existingToken = cookieValue(request, csrfCookieName);
	const csrfToken =
		existingToken && /^[\w-]{43}$/.test(existingToken)
			? existingToken
			: newCsrfToken();
	const response = NextResponse.json(
		{ csrfToken },
		{ headers: { "Cache-Control": "no-store" } },
	);

	response.cookies.set(csrfCookieName, csrfToken, {
		httpOnly: false,
		maxAge: 60 * 60,
		path: "/",
		sameSite: "strict",
		secure: true,
	});

	return response;
}
