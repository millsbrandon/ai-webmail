import type { NextRequest } from "next/server";
import { sessionManagementResponse } from "../../../../../../../lib/auth/session-management-http";

export const runtime = "nodejs";

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ organizationId: string; userId: string }> },
) {
	const { organizationId, userId } = await context.params;
	return sessionManagementResponse(request, {
		kind: "disable",
		organizationId,
		userId,
	});
}
