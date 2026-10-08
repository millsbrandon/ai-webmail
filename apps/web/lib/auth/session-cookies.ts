import type { NextResponse } from "next/server";
import { csrfCookieName, sessionCookieName } from "./csrf";

type SessionCookies = {
	sessionToken: string;
	csrfToken: string;
	absoluteExpiresAt: Date;
};

export function setSessionCookies(
	response: NextResponse,
	session: SessionCookies,
	now = Date.now(),
) {
	const maxAge = Math.floor((session.absoluteExpiresAt.getTime() - now) / 1000);

	response.cookies.set(sessionCookieName, session.sessionToken, {
		httpOnly: true,
		maxAge,
		path: "/",
		sameSite: "lax",
		secure: true,
	});
	response.cookies.set(csrfCookieName, session.csrfToken, {
		httpOnly: false,
		maxAge,
		path: "/",
		sameSite: "strict",
		secure: true,
	});

	return response;
}
