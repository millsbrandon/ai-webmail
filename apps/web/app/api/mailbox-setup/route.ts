import { organizationMemberships, organizations } from "@ai-webmail/db/schema";
import {
	syntheticFolders,
	validateMailboxSetup,
} from "@ai-webmail/domain/mailbox-setup";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import {
	cookieValue,
	hasValidCsrf,
	hasValidOrigin,
	sessionCookieName,
} from "../../../lib/auth/csrf";
import { readBoundedJsonBody } from "../../../lib/auth/request-body";
import {
	requireRecentSession,
	SessionManagementError,
} from "../../../lib/auth/session-management";
import { getActiveSession } from "../../../lib/auth/sessions";
import { getDatabase } from "../../../lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const uuidPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function respond(request: NextRequest, preview: boolean) {
	if (preview && !hasValidOrigin(request)) {
		return NextResponse.json(
			{ error: "Request could not be verified." },
			{ status: 403, headers },
		);
	}
	const token = cookieValue(request, sessionCookieName);
	if (!token)
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401, headers },
		);
	try {
		const db = getDatabase().db;
		const session = await getActiveSession(db, token);
		if (!session)
			return NextResponse.json(
				{ error: "Authentication required." },
				{ status: 401, headers },
			);
		if (!preview) {
			const ownedOrganizations = await db
				.select({ id: organizations.id, name: organizations.name })
				.from(organizations)
				.innerJoin(
					organizationMemberships,
					eq(organizationMemberships.organizationId, organizations.id),
				)
				.where(
					and(
						eq(organizationMemberships.userId, session.userId),
						eq(organizationMemberships.role, "owner"),
					),
				)
				.orderBy(organizations.name, organizations.id);
			return NextResponse.json(
				{
					organizations: ownedOrganizations,
					folders: syntheticFolders,
					mode: "synthetic_preview",
				},
				{ headers },
			);
		}
		if (!hasValidCsrf(request, session.csrfTokenHash)) {
			return NextResponse.json(
				{ error: "Request could not be verified." },
				{ status: 403, headers },
			);
		}
		const parsed = await readBoundedJsonBody(request, 8192);
		if (!parsed.ok)
			return NextResponse.json(
				{ error: "Invalid or oversized preview settings." },
				{ status: 400, headers },
			);
		const { organizationId, settings, ...extra } = parsed.value;
		if (Object.keys(extra).length > 0) {
			return NextResponse.json(
				{
					error:
						"Only organizationId and settings are accepted. Do not submit credentials.",
				},
				{ status: 400, headers },
			);
		}
		if (
			typeof organizationId !== "string" ||
			!uuidPattern.test(organizationId)
		) {
			return NextResponse.json(
				{ error: "Setup is not available for this organization." },
				{ status: 403, headers },
			);
		}
		return await db.transaction(async (transaction) => {
			const actor = await requireRecentSession(transaction, token);
			const [owner] = await transaction
				.select({ id: organizationMemberships.userId })
				.from(organizationMemberships)
				.where(
					and(
						eq(organizationMemberships.organizationId, organizationId),
						eq(organizationMemberships.userId, actor.userId),
						eq(organizationMemberships.role, "owner"),
					),
				)
				.for("update");
			if (!owner)
				return NextResponse.json(
					{ error: "Setup is not available for this organization." },
					{ status: 403, headers },
				);
			const validation = validateMailboxSetup(settings, syntheticFolders);
			if (!validation.ok) {
				return NextResponse.json(
					{
						error: "Check the highlighted settings.",
						errors: validation.errors,
					},
					{ status: 400, headers },
				);
			}
			if (!validation.value.address.endsWith(".test")) {
				return NextResponse.json(
					{
						error: "Check the highlighted settings.",
						errors: {
							address:
								"Use an address ending in .test for this disconnected preview.",
						},
					},
					{ status: 400, headers },
				);
			}
			return NextResponse.json(
				{
					mode: "synthetic_preview",
					settings: validation.value,
					providerVerified: false,
					persisted: false,
					sendingEnabled: false,
				},
				{ headers },
			);
		});
	} catch (error) {
		if (error instanceof SessionManagementError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status, headers },
			);
		}
		console.error("Mailbox setup preview failed unexpectedly.", error);
		return NextResponse.json(
			{ error: "Mailbox setup preview is temporarily unavailable." },
			{ status: 503, headers },
		);
	}
}

export async function GET(request: NextRequest) {
	return respond(request, false);
}
export async function POST(request: NextRequest) {
	return respond(request, true);
}
