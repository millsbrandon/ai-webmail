import { type NextRequest, NextResponse } from "next/server";
import { hasValidCsrf, hasValidOrigin } from "../../../../../lib/auth/csrf";
import { acceptInvitation } from "../../../../../lib/auth/invitations";
import { readBoundedJsonBody } from "../../../../../lib/auth/request-body";
import { getDatabase } from "../../../../../lib/database";

export const runtime = "nodejs";

const invalidInvitation = {
	error: "This invitation could not be used. Request a new invitation.",
};

export async function POST(request: NextRequest) {
	if (!hasValidOrigin(request) || !hasValidCsrf(request)) {
		return NextResponse.json(
			{ error: "Request could not be verified." },
			{ status: 403, headers: { "Cache-Control": "no-store" } },
		);
	}

	const parsed = await readBoundedJsonBody(request, 8192);
	if (!parsed.ok) {
		return NextResponse.json(invalidInvitation, {
			status: 400,
			headers: { "Cache-Control": "no-store" },
		});
	}
	const details = parsed.value;

	if (
		typeof details.token !== "string" ||
		typeof details.email !== "string" ||
		typeof details.displayName !== "string" ||
		typeof details.password !== "string" ||
		Buffer.byteLength(details.password, "utf8") > 1024
	) {
		return NextResponse.json(invalidInvitation, {
			status: 400,
			headers: { "Cache-Control": "no-store" },
		});
	}

	try {
		const accepted = await acceptInvitation(
			getDatabase().db,
			details.token,
			details.email,
			details.displayName,
			details.password,
		);

		if (!accepted) {
			return NextResponse.json(invalidInvitation, {
				status: 400,
				headers: { "Cache-Control": "no-store" },
			});
		}

		return NextResponse.json(
			{ status: "invitation_accepted" },
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch (error) {
		console.error("Invitation acceptance failed unexpectedly.", error);
		return NextResponse.json(
			{ error: "Invitation could not be processed." },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
}
