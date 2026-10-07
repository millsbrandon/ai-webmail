import assert from "node:assert/strict";
import { test } from "node:test";
import { getTableConfig } from "drizzle-orm/pg-core";
import { createDatabase } from "./client";
import { systemSettings } from "./schema";

test("requires a database connection string", () => {
	assert.throws(
		() => createDatabase(""),
		/A database connection string is required\./,
	);
});

test("defines system settings in the restricted app schema", () => {
	const table = getTableConfig(systemSettings);

	assert.equal(table.name, "system_settings");
	assert.equal(table.schema, "app");
	assert.deepEqual(
		table.columns.map((column) => column.name),
		["key", "value", "updated_at"],
	);
});
