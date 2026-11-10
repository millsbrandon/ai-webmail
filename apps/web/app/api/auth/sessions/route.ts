import type { NextRequest } from "next/server";
import { sessionManagementResponse } from "../../../../lib/auth/session-management-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	return sessionManagementResponse(request, { kind: "list" });
}

export async function DELETE(request: NextRequest) {
	return sessionManagementResponse(request, { kind: "revoke" });
}
