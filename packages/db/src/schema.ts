import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	check,
	foreignKey,
	index,
	integer,
	jsonb,
	pgSchema,
	primaryKey,
	text,
	timestamp,
	unique,
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
		authenticationMethod: text("authentication_method")
			.$type<"password" | "passkey" | "recovery" | "unknown">()
			.notNull()
			.default("unknown"),
		deviceLabel: text("device_label").notNull().default("Browser session"),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
	},
	(table) => [
		uniqueIndex("auth_sessions_token_hash_unique").on(table.tokenHash),
		check(
			"auth_sessions_method_valid",
			sql`${table.authenticationMethod} IN ('password', 'passkey', 'recovery', 'unknown')`,
		),
		check(
			"auth_sessions_device_label_bounded",
			sql`char_length(${table.deviceLabel}) BETWEEN 1 AND 80`,
		),
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

export const organizations = app.table("organizations", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const organizationMemberships = app.table(
	"organization_memberships",
	{
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: text("role").$type<"owner" | "administrator" | "member">().notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.organizationId, table.userId] }),
		check(
			"organization_memberships_role_valid",
			sql`${table.role} IN ('owner', 'administrator', 'member')`,
		),
	],
);

export const mailboxes = app.table(
	"mailboxes",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		displayName: text("display_name").notNull(),
		address: text("address").notNull(),
		status: text("status")
			.$type<"active" | "disabled">()
			.notNull()
			.default("active"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		unique("mailboxes_organization_id_unique").on(
			table.organizationId,
			table.id,
		),
		uniqueIndex("mailboxes_organization_address_unique").on(
			table.organizationId,
			table.address,
		),
		check(
			"mailboxes_address_normalized",
			sql`${table.address} = lower(btrim(${table.address}))`,
		),
		check(
			"mailboxes_status_valid",
			sql`${table.status} IN ('active', 'disabled')`,
		),
	],
);

export const mailboxMemberships = app.table(
	"mailbox_memberships",
	{
		organizationId: uuid("organization_id").notNull(),
		mailboxId: uuid("mailbox_id").notNull(),
		userId: uuid("user_id").notNull(),
		role: text("role").$type<"viewer" | "responder" | "manager">().notNull(),
		approveAi: boolean("approve_ai"),
		export: boolean("export").notNull().default(false),
		delete: boolean("delete").notNull().default(false),
		manageRules: boolean("manage_rules"),
	},
	(table) => [
		primaryKey({
			columns: [table.organizationId, table.mailboxId, table.userId],
		}),
		foreignKey({
			columns: [table.organizationId, table.mailboxId],
			foreignColumns: [mailboxes.organizationId, mailboxes.id],
			name: "mailbox_memberships_mailbox_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.organizationId, table.userId],
			foreignColumns: [
				organizationMemberships.organizationId,
				organizationMemberships.userId,
			],
			name: "mailbox_memberships_organization_member_fk",
		}).onDelete("cascade"),
		check(
			"mailbox_memberships_role_valid",
			sql`${table.role} IN ('viewer', 'responder', 'manager')`,
		),
	],
);

export const auditEvents = app.table(
	"audit_events",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		actorUserId: uuid("actor_user_id").notNull(),
		actorSessionId: uuid("actor_session_id"),
		organizationId: uuid("organization_id"),
		action: text("action")
			.$type<
				| "session.created"
				| "session.revoked"
				| "sessions.revoked_others"
				| "user.disabled"
				| "passkey.registered"
				| "passkey.removed"
				| "recovery.rotated"
			>()
			.notNull(),
		targetId: text("target_id").notNull(),
		outcome: text("outcome").$type<"success">().notNull().default("success"),
		correlationId: uuid("correlation_id").defaultRandom().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("audit_events_actor_created_idx").on(
			table.actorUserId,
			table.createdAt,
		),
		check(
			"audit_events_action_valid",
			sql`${table.action} IN ('session.created', 'session.revoked', 'sessions.revoked_others', 'user.disabled', 'passkey.registered', 'passkey.removed', 'recovery.rotated')`,
		),
		check(
			"audit_events_target_bounded",
			sql`char_length(${table.targetId}) BETWEEN 1 AND 2048`,
		),
		check("audit_events_outcome_valid", sql`${table.outcome} = 'success'`),
	],
);
