import {
	getAccessibleMailbox,
	listAccessibleMailboxes,
} from "@ai-webmail/domain/mailbox-access";
import { type NextRequest, NextResponse } from "next/server";
import { cookieValue, sessionCookieName } from "../auth/csrf";
import { getActiveSession } from "../auth/sessions";
import { getDatabase } from "../database";

const uuidPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = { "Cache-Control": "no-store" };

export async function mailboxResponse(
	request: NextRequest,
	organizationId: string,
	mailboxId?: string,
) {
	const token = cookieValue(request, sessionCookieName);
	if (!token) {
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401, headers },
		);
	}
	try {
		const db = getDatabase().db;
		const session = await getActiveSession(db, token);
		if (!session) {
			return NextResponse.json(
				{ error: "Authentication required." },
				{ status: 401, headers },
			);
		}
		if (
			!uuidPattern.test(organizationId) ||
			(mailboxId !== undefined && !uuidPattern.test(mailboxId))
		) {
			return NextResponse.json(
				{ error: "Mailbox not found." },
				{ status: 404, headers },
			);
		}
		const actor = { userId: session.userId, organizationId };
		if (mailboxId !== undefined) {
			const mailbox = await getAccessibleMailbox(db, actor, mailboxId);
			return mailbox
				? NextResponse.json({ mailbox }, { headers })
				: NextResponse.json(
						{ error: "Mailbox not found." },
						{ status: 404, headers },
					);
		}
		const mailboxes = await listAccessibleMailboxes(db, actor);
		return NextResponse.json({ mailboxes }, { headers });
	} catch (error) {
		console.error("Mailbox access failed unexpectedly.", error);
		return NextResponse.json(
			{ error: "Mailbox information is temporarily unavailable." },
			{ status: 503, headers },
		);
	}
}
