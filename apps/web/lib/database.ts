import { createDatabase } from "@ai-webmail/db/client";

declare global {
	var webmailDatabase:
		| (ReturnType<typeof createDatabase> & { connectionString: string })
		| undefined;
}

export function getDatabase() {
	const connectionString = process.env.DATABASE_URL;

	if (!connectionString) {
		throw new Error("DATABASE_URL is required for database-backed routes.");
	}

	if (
		globalThis.webmailDatabase &&
		globalThis.webmailDatabase.connectionString !== connectionString
	) {
		throw new Error(
			"DATABASE_URL changed after the database pool was initialized.",
		);
	}

	globalThis.webmailDatabase ??= {
		...createDatabase(connectionString),
		connectionString,
	};

	return globalThis.webmailDatabase;
}
