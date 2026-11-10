import type { NextRequest } from "next/server";
import { mailboxResponse } from "../../../../../../lib/mailboxes/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ organizationId: string; mailboxId: string }> },
) {
	const { organizationId, mailboxId } = await context.params;
	return mailboxResponse(request, organizationId, mailboxId);
}
