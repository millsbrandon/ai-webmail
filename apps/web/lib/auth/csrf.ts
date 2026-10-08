import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const sessionCookieName = "__Host-webmail_session";
export const csrfCookieName = "__Host-webmail_csrf";

export function newCsrfToken() {
	return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
	return createHash("sha256").update(token).digest("hex");
}

function constantTimeEqual(left: string, right: string) {
	const leftBytes = Buffer.from(left);
	const rightBytes = Buffer.from(right);

	return (
		leftBytes.length === rightBytes.length &&
		timingSafeEqual(leftBytes, rightBytes)
	);
}

export function cookieValue(request: Request, name: string) {
	const cookieHeader = request.headers.get("cookie");
	if (!cookieHeader) {
		return undefined;
	}

	for (const cookie of cookieHeader.split(";")) {
		const separator = cookie.indexOf("=");
		if (separator < 0) {
			continue;
		}

		if (cookie.slice(0, separator).trim() === name) {
			return cookie.slice(separator + 1).trim();
		}
	}

	return undefined;
}

export function hasValidOrigin(request: Request) {
	const configuredOrigin = process.env.APP_ORIGIN;
	const requestOrigin = request.headers.get("origin");

	if (!configuredOrigin || !requestOrigin) {
		return false;
	}

	try {
		const configured = new URL(configuredOrigin);
		const request = new URL(requestOrigin);
		return (
			(configured.protocol === "http:" || configured.protocol === "https:") &&
			!configured.username &&
			!configured.password &&
			configured.pathname === "/" &&
			!configured.search &&
			!configured.hash &&
			(process.env.NODE_ENV !== "production" ||
				configured.protocol === "https:") &&
			configured.origin === configuredOrigin.replace(/\/$/, "") &&
			request.origin === requestOrigin &&
			request.origin === configured.origin
		);
	} catch {
		return false;
	}
}

export function hasValidCsrf(request: Request, expectedTokenHash?: string) {
	const cookieToken = cookieValue(request, csrfCookieName);
	const headerToken = request.headers.get("x-csrf-token");

	if (
		!cookieToken ||
		!headerToken ||
		!constantTimeEqual(cookieToken, headerToken)
	) {
		return false;
	}

	if (!/^[\w-]{43}$/.test(cookieToken)) {
		return false;
	}

	return (
		!expectedTokenHash ||
		constantTimeEqual(hashToken(cookieToken), expectedTokenHash)
	);
}
