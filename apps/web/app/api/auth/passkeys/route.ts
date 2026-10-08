import { passkeys, recoveryCodes } from "@ai-webmail/db/schema";
import { and, eq, isNull } from "drizzle-orm";
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
		const db = getDatabase().db;
		const session = await getActiveSession(db, sessionToken);
		if (!session) {
			return NextResponse.json(
				{ error: "Authentication required." },
				{ status: 401, headers: { "Cache-Control": "no-store" } },
			);
		}

		const [credentials, codes] = await Promise.all([
			db
				.select({
					credentialId: passkeys.credentialId,
					name: passkeys.name,
					deviceType: passkeys.deviceType,
					backedUp: passkeys.backedUp,
					createdAt: passkeys.createdAt,
					lastUsedAt: passkeys.lastUsedAt,
				})
				.from(passkeys)
				.where(eq(passkeys.userId, session.userId)),
			db
				.select({ id: recoveryCodes.id })
				.from(recoveryCodes)
				.where(
					and(
						eq(recoveryCodes.userId, session.userId),
						isNull(recoveryCodes.usedAt),
					),
				),
		]);

		return NextResponse.json(
			{
				passkeys: credentials,
				remainingRecoveryCodes: codes.length,
				lastAuthenticatedAt: session.lastAuthenticatedAt.toISOString(),
			},
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		console.error("Passkey listing failed unexpectedly.", error);
		return NextResponse.json(
			{ error: "Passkey information is temporarily unavailable." },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
}
