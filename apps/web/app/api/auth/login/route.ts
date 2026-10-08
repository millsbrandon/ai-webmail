import { type NextRequest, NextResponse } from "next/server";
import {
	csrfCookieName,
	hasValidCsrf,
	hasValidOrigin,
	sessionCookieName,
} from "../../../../lib/auth/csrf";
import { authenticate } from "../../../../lib/auth/login";
import { readBoundedJsonBody } from "../../../../lib/auth/request-body";
import { getDatabase } from "../../../../lib/database";

export const runtime = "nodejs";

const invalidCredentials = { error: "Email or password is incorrect." };

export async function POST(request: NextRequest) {
	if (!hasValidOrigin(request) || !hasValidCsrf(request)) {
		return NextResponse.json(
			{ error: "Request could not be verified." },
			{ status: 403, headers: { "Cache-Control": "no-store" } },
		);
	}

	const parsed = await readBoundedJsonBody(request, 8192);
	if (!parsed.ok) {
		return NextResponse.json(invalidCredentials, {
			status: 401,
			headers: { "Cache-Control": "no-store" },
		});
	}
	const credentials = parsed.value;

	if (
		typeof credentials.email !== "string" ||
		typeof credentials.password !== "string" ||
		Buffer.byteLength(credentials.email, "utf8") > 254 ||
		Buffer.byteLength(credentials.password, "utf8") > 1024
	) {
		return NextResponse.json(invalidCredentials, {
			status: 401,
			headers: { "Cache-Control": "no-store" },
		});
	}

	try {
		const result = await authenticate(
			getDatabase().db,
			credentials.email,
			credentials.password,
		);

		if (!result) {
			return NextResponse.json(invalidCredentials, {
				status: 401,
				headers: { "Cache-Control": "no-store" },
			});
		}

		const response = NextResponse.json(
			{
				status: "authenticated",
				csrfToken: result.session.csrfToken,
				user: {
					email: result.user.email,
					displayName: result.user.displayName,
				},
			},
			{ headers: { "Cache-Control": "no-store" } },
		);
		const maxAge = Math.floor(
			(result.session.absoluteExpiresAt.getTime() - Date.now()) / 1000,
		);

		response.cookies.set(sessionCookieName, result.session.sessionToken, {
			httpOnly: true,
			maxAge,
			path: "/",
			sameSite: "lax",
			secure: true,
		});
		response.cookies.set(csrfCookieName, result.session.csrfToken, {
			httpOnly: false,
			maxAge,
			path: "/",
			sameSite: "strict",
			secure: true,
		});

		return response;
	} catch (error) {
		console.error("Password authentication failed unexpectedly.", error);
		return NextResponse.json(
			{ error: "Sign-in is temporarily unavailable." },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
}
