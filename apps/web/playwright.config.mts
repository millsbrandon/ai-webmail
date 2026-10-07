import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const environmentFile = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(environmentFile)) {
	process.loadEnvFile(environmentFile);
}

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL must be set to run end-to-end tests.");
}

const testDatabaseUrl = new URL(process.env.DATABASE_URL);
testDatabaseUrl.pathname = "/webmail_test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL: "http://127.0.0.1:3100",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
		url: "http://127.0.0.1:3100",
		env: { DATABASE_URL: testDatabaseUrl.toString() },
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
