import type { NextRequest } from "next/server";
import { sessionManagementResponse } from "../../../../../lib/auth/session-management-http";

export const runtime = "nodejs";

export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ sessionId: string }> },
) {
	const { sessionId } = await context.params;
	return sessionManagementResponse(request, { kind: "revoke", sessionId });
}
