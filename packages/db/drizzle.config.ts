import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

loadEnvFile(fileURLToPath(new URL("../../.env.migrations", import.meta.url)));

const connectionString = process.env.DATABASE_MIGRATOR_URL;

if (!connectionString) {
	throw new Error(
		"DATABASE_MIGRATOR_URL must be set to run database migrations.",
	);
}

export default defineConfig({
	schema: fileURLToPath(new URL("./src/schema.ts", import.meta.url)),
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: connectionString,
	},
});
