import { createDatabase } from "@ai-webmail/db/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

declare global {
	var webmailDatabase:
		| (ReturnType<typeof createDatabase> & { connectionString: string })
		| undefined;
}

export async function GET() {
	const connectionString = process.env.DATABASE_URL;

	if (!connectionString) {
		return NextResponse.json(
			{ status: "not_configured" },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}

	if (!globalThis.webmailDatabase) {
		globalThis.webmailDatabase = {
			...createDatabase(connectionString),
			connectionString,
		};
	}

	try {
		await globalThis.webmailDatabase.pool.query("SELECT 1");
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
