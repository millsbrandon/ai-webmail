import type { WebmailDatabase } from "@ai-webmail/db/client";
import {
	mailboxes,
	mailboxMemberships,
	organizationMemberships,
	users,
} from "@ai-webmail/db/schema";
import { and, eq, inArray, type SQL, sql } from "drizzle-orm";

type MailboxMembership = typeof mailboxMemberships.$inferSelect;

export const mailboxCapabilities = [
	"read",
	"compose",
	"send",
	"notes",
	"labels",
	"assign",
	"request_ai",
	"approve_ai",
	"export",
	"delete",
	"manage_rules",
	"manage_templates",
] as const;
export type MailboxCapability = (typeof mailboxCapabilities)[number];
export type MailboxPolicy = Pick<
	MailboxMembership,
	"role" | "approveAi" | "export" | "delete" | "manageRules"
>;
export type MailboxActor = { userId: string; organizationId: string };

export function capabilitiesForMembership(
	policy: MailboxPolicy,
): MailboxCapability[] {
	const capabilities: MailboxCapability[] = ["read"];
	if (policy.role === "viewer") {
		return capabilities;
	}
	capabilities.push(
		"compose",
		"send",
		"notes",
		"labels",
		"assign",
		"request_ai",
	);
	if (policy.role === "manager") {
		capabilities.push("manage_templates");
	}
	if (policy.approveAi ?? policy.role === "manager") {
		capabilities.push("approve_ai");
	}
	if (policy.manageRules ?? policy.role === "manager") {
		capabilities.push("manage_rules");
	}
	if (policy.export) {
		capabilities.push("export");
	}
	if (policy.delete) {
		capabilities.push("delete");
	}
	return capabilities;
}

function capabilityCondition(capability: MailboxCapability): SQL {
	const contributor = inArray(mailboxMemberships.role, [
		"responder",
		"manager",
	]);
	const manager = eq(mailboxMemberships.role, "manager");
	switch (capability) {
		case "read":
			return inArray(mailboxMemberships.role, [
				"viewer",
				"responder",
				"manager",
			]);
		case "manage_templates":
			return manager;
		case "approve_ai":
			return sql`(${contributor}) AND coalesce(${mailboxMemberships.approveAi}, (${manager}))`;
		case "manage_rules":
			return sql`(${contributor}) AND coalesce(${mailboxMemberships.manageRules}, (${manager}))`;
		case "export":
			return sql`(${contributor}) AND ${mailboxMemberships.export}`;
		case "delete":
			return sql`(${contributor}) AND ${mailboxMemberships.delete}`;
		case "compose":
		case "send":
		case "notes":
		case "labels":
		case "assign":
		case "request_ai":
			return contributor;
		default:
			throw new Error(`Unknown mailbox capability: ${capability}`);
	}
}

const mailboxSelection = {
	id: mailboxes.id,
	organizationId: mailboxes.organizationId,
	displayName: mailboxes.displayName,
	address: mailboxes.address,
	role: mailboxMemberships.role,
	approveAi: mailboxMemberships.approveAi,
	export: mailboxMemberships.export,
	delete: mailboxMemberships.delete,
	manageRules: mailboxMemberships.manageRules,
};

function scopedMailboxes(
	db: WebmailDatabase,
	actor: MailboxActor,
	capability: MailboxCapability,
	mailboxId?: string,
) {
	return db
		.select(mailboxSelection)
		.from(mailboxes)
		.innerJoin(
			mailboxMemberships,
			and(
				eq(mailboxMemberships.organizationId, mailboxes.organizationId),
				eq(mailboxMemberships.mailboxId, mailboxes.id),
			),
		)
		.innerJoin(
			organizationMemberships,
			and(
				eq(
					organizationMemberships.organizationId,
					mailboxMemberships.organizationId,
				),
				eq(organizationMemberships.userId, mailboxMemberships.userId),
			),
		)
		.innerJoin(users, eq(users.id, mailboxMemberships.userId))
		.where(
			and(
				eq(mailboxes.organizationId, actor.organizationId),
				eq(mailboxMemberships.userId, actor.userId),
				eq(users.status, "active"),
				eq(mailboxes.status, "active"),
				capabilityCondition(capability),
				mailboxId === undefined ? undefined : eq(mailboxes.id, mailboxId),
			),
		);
}

type ScopedMailbox = Awaited<ReturnType<typeof scopedMailboxes>>[number];

function summarizeMailbox(mailbox: ScopedMailbox) {
	return {
		id: mailbox.id,
		organizationId: mailbox.organizationId,
		displayName: mailbox.displayName,
		address: mailbox.address,
		capabilities: capabilitiesForMembership(mailbox),
	};
}

export async function listAccessibleMailboxes(
	db: WebmailDatabase,
	actor: MailboxActor,
	capability: MailboxCapability = "read",
) {
	return (
		await scopedMailboxes(db, actor, capability).orderBy(mailboxes.id)
	).map(summarizeMailbox);
}

export async function getAccessibleMailbox(
	db: WebmailDatabase,
	actor: MailboxActor,
	mailboxId: string,
	capability: MailboxCapability = "read",
) {
	const rows = await scopedMailboxes(db, actor, capability, mailboxId).limit(1);
	return rows[0] ? summarizeMailbox(rows[0]) : undefined;
}
