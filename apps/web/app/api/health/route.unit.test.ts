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

test("reports when the database is not configured", async () => {
	delete process.env.DATABASE_URL;

	const response = await GET();

	assert.equal(response.status, 503);
	assert.equal(response.headers.get("cache-control"), "no-store");
	assert.deepEqual(await response.json(), { status: "not_configured" });
});

test("reports unavailable databases without returning connection details", async () => {
	const connectionString =
		"postgresql://test-user:test-password@127.0.0.1:1/unavailable";
	process.env.DATABASE_URL = connectionString;

	const response = await GET();
	const body = await response.text();

	assert.equal(response.status, 503);
	assert.equal(response.headers.get("cache-control"), "no-store");
	assert.deepEqual(JSON.parse(body), { status: "database_unavailable" });
	assert.equal(body.includes(connectionString), false);
});
