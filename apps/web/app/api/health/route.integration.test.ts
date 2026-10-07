import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { GET } from "./route";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(async () => {
	const database = globalThis.webmailDatabase;
	globalThis.webmailDatabase = undefined;
	await database?.pool.end();

	if (originalDatabaseUrl === undefined) {
		delete process.env.DATABASE_URL;
	} else {
		process.env.DATABASE_URL = originalDatabaseUrl;
	}
});

test("connects with the runtime role to the isolated test database", async () => {
	assert.ok(
		originalDatabaseUrl,
		"DATABASE_URL must be set for integration tests.",
	);

	const testDatabaseUrl = new URL(originalDatabaseUrl);
	testDatabaseUrl.pathname = "/webmail_test";
	process.env.DATABASE_URL = testDatabaseUrl.toString();

	const response = await GET();

	assert.equal(response.status, 200);
	assert.equal(response.headers.get("cache-control"), "no-store");
	assert.deepEqual(await response.json(), { status: "ok" });
});
