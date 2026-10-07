import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type WebmailDatabase = NodePgDatabase<typeof schema>;

export function createDatabase(connectionString: string) {
	if (!connectionString) {
		throw new Error("A database connection string is required.");
	}

	const pool = new Pool({
		connectionString,
		max: 5,
		idleTimeoutMillis: 30_000,
		connectionTimeoutMillis: 5_000,
		application_name: "ai-webmail",
	});

	return {
		db: drizzle(pool, { schema }),
		pool,
	};
}
