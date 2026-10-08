import { execFileSync } from "node:child_process";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

loadEnvFile(fileURLToPath(new URL("../.env.migrations", import.meta.url)));

const testDatabaseUrl = process.env.DATABASE_TEST_URL;
if (!testDatabaseUrl) {
	throw new Error("DATABASE_TEST_URL must be set in .env.migrations.");
}

const parsedUrl = new URL(testDatabaseUrl);
if (
	!["postgres:", "postgresql:"].includes(parsedUrl.protocol) ||
	parsedUrl.pathname !== "/webmail_test"
) {
	throw new Error("Refusing to migrate a database other than webmail_test.");
}

execFileSync("npm", ["run", "db:migrate", "--workspace=@ai-webmail/db"], {
	env: { ...process.env, DATABASE_MIGRATOR_URL: testDatabaseUrl },
	stdio: "inherit",
});
