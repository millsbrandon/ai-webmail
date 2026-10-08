import { NextResponse } from "next/server";
import { getDatabase } from "../../../lib/database";

export const runtime = "nodejs";

export async function GET() {
	if (!process.env.DATABASE_URL) {
		return NextResponse.json(
			{ status: "not_configured" },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}

	try {
		await getDatabase().pool.query("SELECT 1");
		return NextResponse.json(
			{ status: "ok" },
			{ headers: { "Cache-Control": "no-store" } },
		);
	} catch {
		console.error("Database health check failed.");
		return NextResponse.json(
			{ status: "database_unavailable" },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
}
