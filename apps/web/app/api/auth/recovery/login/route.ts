import { recoveryCodes, users } from "@ai-webmail/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import {
	hashToken,
	hasValidCsrf,
	hasValidOrigin,
} from "../../../../../lib/auth/csrf";
import { readBoundedJsonBody } from "../../../../../lib/auth/request-body";
import { setSessionCookies } from "../../../../../lib/auth/session-cookies";
import { createSession } from "../../../../../lib/auth/sessions";
import { getDatabase } from "../../../../../lib/database";

export const runtime = "nodejs";

const invalidCode = {
	error: "Recovery code is incorrect or has already been used.",
};
const codePattern = /^[a-f0-9]{32}$/i;

export async function POST(request: NextRequest) {
	if (!hasValidOrigin(request) || !hasValidCsrf(request)) {
		return NextResponse.json(
			{ error: "Request could not be verified." },
			{ status: 403, headers: { "Cache-Control": "no-store" } },
		);
	}

	const parsed = await readBoundedJsonBody(request, 1024);
	if (
		!parsed.ok ||
		typeof parsed.value.code !== "string" ||
		!codePattern.test(parsed.value.code)
	) {
		return NextResponse.json(invalidCode, {
			status: 401,
			headers: { "Cache-Control": "no-store" },
		});
	}
	const code = parsed.value.code.toLowerCase();

	try {
		const db = getDatabase().db;
		const result = await db.transaction(async (transaction) => {
			const [candidate] = await transaction
				.select({
					id: recoveryCodes.id,
					userId: recoveryCodes.userId,
				})
				.from(recoveryCodes)
				.where(
					and(
						eq(recoveryCodes.codeHash, hashToken(code)),
						isNull(recoveryCodes.usedAt),
					),
				)
				.limit(1);

			if (!candidate) {
				return undefined;
			}

			const [user] = await transaction
				.select({
					id: users.id,
					email: users.email,
					displayName: users.displayName,
				})
				.from(users)
				.where(and(eq(users.id, candidate.userId), eq(users.status, "active")))
				.for("update")
				.limit(1);
			if (!user) {
				return undefined;
			}

			const [consumed] = await transaction
				.update(recoveryCodes)
				.set({ usedAt: new Date() })
				.where(
					and(
						eq(recoveryCodes.id, candidate.id),
						eq(recoveryCodes.userId, user.id),
						isNull(recoveryCodes.usedAt),
					),
				)
				.returning({ id: recoveryCodes.id });
			if (!consumed) {
				return undefined;
			}

			const session = await createSession(transaction, user.id);
			return {
				session,
				user: { email: user.email, displayName: user.displayName },
			};
		});

		if (!result) {
			return NextResponse.json(invalidCode, {
				status: 401,
				headers: { "Cache-Control": "no-store" },
			});
		}

		const response = NextResponse.json(
			{
				status: "authenticated",
				csrfToken: result.session.csrfToken,
				user: result.user,
			},
			{ headers: { "Cache-Control": "no-store" } },
		);
		return setSessionCookies(response, result.session);
	} catch (error) {
		console.error("Recovery code authentication failed unexpectedly.", error);
		return NextResponse.json(
			{ error: "Recovery sign-in is temporarily unavailable." },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
}
