import { type NextRequest, NextResponse } from "next/server";
import { hasValidCsrf, hasValidOrigin } from "../../../../../../lib/auth/csrf";
import { createAuthenticationOptions } from "../../../../../../lib/auth/passkeys";
import { getDatabase } from "../../../../../../lib/database";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	if (!hasValidOrigin(request) || !hasValidCsrf(request)) {
		return NextResponse.json(
			{ error: "Request could not be verified." },
			{ status: 403, headers: { "Cache-Control": "no-store" } },
		);
	}

	try {
		const result = await createAuthenticationOptions(getDatabase().db);
		return NextResponse.json(result, {
			headers: { "Cache-Control": "no-store" },
		});
	} catch (error) {
		console.error("Passkey authentication options failed unexpectedly.", error);
		return NextResponse.json(
			{ error: "Passkey sign-in is temporarily unavailable." },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
}
