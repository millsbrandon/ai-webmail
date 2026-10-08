import { sql } from "drizzle-orm";
import {
	check,
	integer,
	jsonb,
	pgSchema,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

const app = pgSchema("app");

export const systemSettings = app.table("system_settings", {
	key: text("key").primaryKey(),
	value: jsonb("value").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const users = app.table(
	"users",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		email: text("email").notNull(),
		displayName: text("display_name").notNull(),
		passwordHash: text("password_hash").notNull(),
		status: text("status").notNull().default("active"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("users_email_unique").on(table.email),
		check(
			"users_email_normalized",
			sql`${table.email} = lower(btrim(${table.email}))`,
		),
		check("users_status_valid", sql`${table.status} in ('active', 'disabled')`),
	],
);

export const invitations = app.table(
	"invitations",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		email: text("email").notNull(),
		tokenHash: text("token_hash").notNull(),
		createdBy: uuid("created_by").references(() => users.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		acceptedAt: timestamp("accepted_at", { withTimezone: true }),
	},
	(table) => [
		uniqueIndex("invitations_token_hash_unique").on(table.tokenHash),
		check(
			"invitations_email_normalized",
			sql`${table.email} = lower(btrim(${table.email}))`,
		),
	],
);

export const authSessions = app.table(
	"auth_sessions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		tokenHash: text("token_hash").notNull(),
		csrfTokenHash: text("csrf_token_hash").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		idleExpiresAt: timestamp("idle_expires_at", {
			withTimezone: true,
		}).notNull(),
		absoluteExpiresAt: timestamp("absolute_expires_at", {
			withTimezone: true,
		}).notNull(),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
	},
	(table) => [
		uniqueIndex("auth_sessions_token_hash_unique").on(table.tokenHash),
	],
);

export const loginAttempts = app.table("login_attempts", {
	accountHash: text("account_hash").primaryKey(),
	failedAttempts: integer("failed_attempts").notNull().default(0),
	windowStartedAt: timestamp("window_started_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	lockedUntil: timestamp("locked_until", { withTimezone: true }),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
