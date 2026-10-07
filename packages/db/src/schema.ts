import { jsonb, pgSchema, text, timestamp } from "drizzle-orm/pg-core";

const app = pgSchema("app");

export const systemSettings = app.table("system_settings", {
	key: text("key").primaryKey(),
	value: jsonb("value").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
