import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
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
		userHandle: text("user_handle").notNull(),
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
		uniqueIndex("users_user_handle_unique").on(table.userHandle),
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
		lastAuthenticatedAt: timestamp("last_authenticated_at", {
			withTimezone: true,
		})
			.notNull()
			.defaultNow(),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
	},
	(table) => [
		uniqueIndex("auth_sessions_token_hash_unique").on(table.tokenHash),
	],
);

export const passkeyChallenges = app.table(
	"passkey_challenges",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		challengeHash: text("challenge_hash").notNull(),
		purpose: text("purpose").notNull(),
		userId: uuid("user_id").references(() => users.id, {
			onDelete: "cascade",
		}),
		sessionId: uuid("session_id").references(() => authSessions.id, {
			onDelete: "cascade",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		consumedAt: timestamp("consumed_at", { withTimezone: true }),
	},
	(table) => [
		uniqueIndex("passkey_challenges_hash_unique").on(table.challengeHash),
		check(
			"passkey_challenges_context_valid",
			sql`(${table.purpose} = 'authentication' AND ${table.userId} IS NULL AND ${table.sessionId} IS NULL) OR (${table.purpose} = 'registration' AND ${table.userId} IS NOT NULL AND ${table.sessionId} IS NOT NULL)`,
		),
	],
);

export const passkeys = app.table(
	"passkeys",
	{
		credentialId: text("credential_id").primaryKey(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		publicKey: text("public_key").notNull(),
		counter: bigint("counter", { mode: "number" }).notNull().default(0),
		transports: jsonb("transports").$type<string[]>().notNull().default([]),
		deviceType: text("device_type").notNull(),
		backedUp: boolean("backed_up").notNull().default(false),
		name: text("name").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
	},
	(table) => [
		check(
			"passkeys_device_type_valid",
			sql`${table.deviceType} IN ('singleDevice', 'multiDevice')`,
		),
		check("passkeys_counter_nonnegative", sql`${table.counter} >= 0`),
	],
);

export const recoveryCodes = app.table(
	"recovery_codes",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		codeHash: text("code_hash").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		usedAt: timestamp("used_at", { withTimezone: true }),
	},
	(table) => [uniqueIndex("recovery_codes_hash_unique").on(table.codeHash)],
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
