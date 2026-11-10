import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { createDatabase } from "@ai-webmail/db/client";
import {
	mailboxes,
	mailboxMemberships,
	organizationMemberships,
	organizations,
	users,
} from "@ai-webmail/db/schema";
import {
	capabilitiesForMembership,
	getAccessibleMailbox,
	listAccessibleMailboxes,
	type MailboxPolicy,
	mailboxCapabilities,
} from "@ai-webmail/domain/mailbox-access";
import { and, eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { sessionCookieName } from "../../../lib/auth/csrf";
import { createSession } from "../../../lib/auth/sessions";
import { GET as getMailbox } from "./[organizationId]/mailboxes/[mailboxId]/route";
import { GET as getMailboxes } from "./[organizationId]/mailboxes/route";

const originalDatabaseUrl = process.env.DATABASE_URL;
if (!originalDatabaseUrl) {
	throw new Error(
		"DATABASE_URL must be configured for mailbox isolation tests.",
	);
}
const testUrl = new URL(originalDatabaseUrl);
testUrl.pathname = "/webmail_test";
process.env.DATABASE_URL = testUrl.toString();
const database = createDatabase(testUrl.toString());
const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const infoId = randomUUID();
const managerId = randomUUID();
const otherMailboxId = randomUUID();
const actors = {
	owner: { id: randomUUID(), role: "owner" },
	a: { id: randomUUID(), role: "member" },
	b: { id: randomUUID(), role: "member" },
	admin: { id: randomUUID(), role: "administrator" },
	outsider: { id: randomUUID(), role: "member" },
} as const;
const sessions = new Map<string, string>();
const aMembership = and(
	eq(mailboxMemberships.organizationId, organizationId),
	eq(mailboxMemberships.mailboxId, infoId),
	eq(mailboxMemberships.userId, actors.a.id),
);

function postgresError(code: string) {
	return (error: unknown) =>
		error instanceof Error &&
		typeof error.cause === "object" &&
		error.cause !== null &&
		"code" in error.cause &&
		error.cause.code === code;
}

function request(token?: string) {
	return new NextRequest("http://localhost:3000/api/organizations", {
		headers: token ? { cookie: `${sessionCookieName}=${token}` } : undefined,
	});
}

function tokenFor(userId: string) {
	const token = sessions.get(userId);
	assert.ok(token);
	return token;
}

async function detail(userId: string, id: string, orgId = organizationId) {
	return getMailbox(request(tokenFor(userId)), {
		params: Promise.resolve({ organizationId: orgId, mailboxId: id }),
	});
}

before(async () => {
	await database.db.insert(organizations).values([
		{ id: organizationId, name: "Synthetic shared-mail organization" },
		{ id: otherOrganizationId, name: "Synthetic isolated organization" },
	]);
	for (const [name, actor] of Object.entries(actors)) {
		await database.db.insert(users).values({
			id: actor.id,
			userHandle: randomUUID(),
			email: `w11-${name}-${actor.id}@example.test`,
			displayName: `Synthetic ${name}`,
			passwordHash: "synthetic-no-password-login",
		});
		await database.db.insert(organizationMemberships).values({
			organizationId:
				name === "outsider" ? otherOrganizationId : organizationId,
			userId: actor.id,
			role: actor.role,
		});
		const session = await createSession(database.db, actor.id);
		sessions.set(actor.id, session.sessionToken);
	}
	await database.db.insert(mailboxes).values([
		{
			id: infoId,
			organizationId,
			displayName: "Synthetic Info",
			address: "info@example.test",
		},
		{
			id: managerId,
			organizationId,
			displayName: "Synthetic Manager",
			address: "manager@example.test",
		},
		{
			id: otherMailboxId,
			organizationId: otherOrganizationId,
			displayName: "Synthetic Other",
			address: "other@example.test",
		},
	]);
	await database.db.insert(mailboxMemberships).values([
		{
			organizationId,
			mailboxId: infoId,
			userId: actors.owner.id,
			role: "manager",
		},
		{
			organizationId,
			mailboxId: managerId,
			userId: actors.owner.id,
			role: "manager",
		},
		{
			organizationId,
			mailboxId: infoId,
			userId: actors.a.id,
			role: "responder",
		},
		{
			organizationId,
			mailboxId: infoId,
			userId: actors.b.id,
			role: "responder",
		},
		{
			organizationId,
			mailboxId: managerId,
			userId: actors.b.id,
			role: "responder",
		},
		{
			organizationId: otherOrganizationId,
			mailboxId: otherMailboxId,
			userId: actors.outsider.id,
			role: "manager",
		},
	]);
});

after(async () => {
	await database.db
		.delete(organizations)
		.where(inArray(organizations.id, [organizationId, otherOrganizationId]));
	await database.db.delete(users).where(
		inArray(
			users.id,
			Object.values(actors).map((actor) => actor.id),
		),
	);
	await database.pool.end();
	const sharedDatabase = globalThis.webmailDatabase;
	globalThis.webmailDatabase = undefined;
	await sharedDatabase?.pool.end();
	process.env.DATABASE_URL = originalDatabaseUrl;
});

test("Owner/A/B lists and direct object reads enforce explicit mailbox membership", async () => {
	for (const [userId, expected] of [
		[actors.owner.id, [infoId, managerId]],
		[actors.a.id, [infoId]],
		[actors.b.id, [infoId, managerId]],
		[actors.admin.id, []],
		[actors.outsider.id, []],
	] as const) {
		const actor = { userId, organizationId };
		const accessible = await listAccessibleMailboxes(database.db, actor);
		assert.deepEqual(
			accessible.map((mailbox) => mailbox.id).sort(),
			[...expected].sort(),
		);
		const response = await getMailboxes(request(tokenFor(userId)), {
			params: Promise.resolve({ organizationId }),
		});
		assert.equal(response.status, 200);
		assert.equal(response.headers.get("Cache-Control"), "no-store");
		assert.deepEqual(await response.json(), { mailboxes: accessible });
		for (const id of [infoId, managerId, otherMailboxId]) {
			const mailbox = await getAccessibleMailbox(database.db, actor, id);
			const allowed = expected.some((expectedId) => expectedId === id);
			assert.equal(Boolean(mailbox), allowed);
			const direct = await detail(userId, id);
			assert.equal(direct.status, allowed ? 200 : 404);
			assert.deepEqual(
				await direct.json(),
				allowed ? { mailbox } : { error: "Mailbox not found." },
			);
		}
	}
	const info = await getAccessibleMailbox(
		database.db,
		{ userId: actors.a.id, organizationId },
		infoId,
		"send",
	);
	assert.equal(info?.address, "info@example.test");
	assert.deepEqual(
		Object.keys(info ?? {}).sort(),
		["id", "organizationId", "displayName", "address", "capabilities"].sort(),
	);
});

test("organization administrators and owners have no implicit content bypass", async () => {
	await database.db
		.delete(mailboxMemberships)
		.where(
			and(
				eq(mailboxMemberships.userId, actors.owner.id),
				eq(mailboxMemberships.mailboxId, managerId),
			),
		);
	try {
		assert.equal((await detail(actors.owner.id, managerId)).status, 404);
		assert.equal((await detail(actors.admin.id, managerId)).status, 404);
	} finally {
		await database.db.insert(mailboxMemberships).values({
			organizationId,
			mailboxId: managerId,
			userId: actors.owner.id,
			role: "manager",
		});
	}
});

test("all capability SQL predicates match role defaults and explicit grant/deny flags", async () => {
	const base = {
		approveAi: null,
		manageRules: null,
		export: false,
		delete: false,
	};
	const policies: MailboxPolicy[] = [
		{ ...base, role: "viewer" },
		{
			role: "viewer",
			approveAi: true,
			manageRules: true,
			export: true,
			delete: true,
		},
		{ ...base, role: "responder" },
		{
			role: "responder",
			approveAi: true,
			manageRules: true,
			export: true,
			delete: true,
		},
		{ ...base, role: "manager" },
		{ ...base, role: "manager", approveAi: false, manageRules: false },
	];
	try {
		for (const policy of policies) {
			await database.db
				.update(mailboxMemberships)
				.set(policy)
				.where(aMembership);
			const expected = capabilitiesForMembership(policy);
			for (const capability of mailboxCapabilities) {
				const actor = { userId: actors.a.id, organizationId };
				const direct = await getAccessibleMailbox(
					database.db,
					actor,
					infoId,
					capability,
				);
				const list = await listAccessibleMailboxes(
					database.db,
					actor,
					capability,
				);
				assert.equal(
					Boolean(direct),
					expected.includes(capability),
					`${policy.role}/${capability}`,
				);
				assert.equal(list.length, expected.includes(capability) ? 1 : 0);
			}
		}
	} finally {
		await database.db
			.update(mailboxMemberships)
			.set({ ...base, role: "responder" })
			.where(aMembership);
	}
});

test("guessed, malformed and cross-organization IDs return non-disclosing results", async () => {
	for (const id of [managerId, otherMailboxId, randomUUID(), "not-a-uuid"]) {
		const response = await detail(actors.a.id, id);
		assert.equal(response.status, 404);
		assert.deepEqual(await response.json(), { error: "Mailbox not found." });
	}
	assert.equal(
		(await detail(actors.owner.id, infoId, otherOrganizationId)).status,
		404,
	);
	assert.equal(
		(await detail(actors.outsider.id, otherMailboxId, organizationId)).status,
		404,
	);
	assert.equal(
		(await detail(actors.outsider.id, otherMailboxId, otherOrganizationId))
			.status,
		200,
	);
	const anonymous = await getMailboxes(request(), {
		params: Promise.resolve({ organizationId }),
	});
	assert.equal(anonymous.status, 401);
	const forged = await getMailbox(request(randomUUID()), {
		params: Promise.resolve({ organizationId, mailboxId: infoId }),
	});
	assert.equal(forged.status, 401);
});

test("composite foreign keys reject cross-organization mailbox and user links", async () => {
	await assert.rejects(
		database.db.insert(mailboxMemberships).values({
			organizationId,
			mailboxId: otherMailboxId,
			userId: actors.a.id,
			role: "viewer",
		}),
		postgresError("23503"),
	);
	await assert.rejects(
		database.db.insert(mailboxMemberships).values({
			organizationId,
			mailboxId: infoId,
			userId: actors.outsider.id,
			role: "viewer",
		}),
		postgresError("23503"),
	);
	await assert.rejects(
		database.db.insert(mailboxMemberships).values({
			organizationId,
			mailboxId: infoId,
			userId: actors.a.id,
			role: "viewer",
		}),
		postgresError("23505"),
	);
});

test("disabled users/mailboxes and revoked organization/mailbox memberships take effect immediately", async () => {
	await database.db
		.update(users)
		.set({ status: "disabled" })
		.where(eq(users.id, actors.a.id));
	assert.equal((await detail(actors.a.id, infoId)).status, 401);
	assert.deepEqual(
		await listAccessibleMailboxes(database.db, {
			userId: actors.a.id,
			organizationId,
		}),
		[],
	);
	await database.db
		.update(users)
		.set({ status: "active" })
		.where(eq(users.id, actors.a.id));
	await database.db
		.update(mailboxes)
		.set({ status: "disabled" })
		.where(eq(mailboxes.id, infoId));
	assert.equal((await detail(actors.a.id, infoId)).status, 404);
	await database.db
		.update(mailboxes)
		.set({ status: "active" })
		.where(eq(mailboxes.id, infoId));
	assert.equal((await detail(actors.a.id, infoId)).status, 200);

	await database.db.delete(mailboxMemberships).where(aMembership);
	assert.equal((await detail(actors.a.id, infoId)).status, 404);
	assert.deepEqual(
		await listAccessibleMailboxes(database.db, {
			userId: actors.a.id,
			organizationId,
		}),
		[],
	);

	await database.db
		.delete(organizationMemberships)
		.where(
			and(
				eq(organizationMemberships.organizationId, organizationId),
				eq(organizationMemberships.userId, actors.b.id),
			),
		);
	assert.equal((await detail(actors.b.id, infoId)).status, 404);
	assert.equal((await detail(actors.b.id, managerId)).status, 404);
	assert.deepEqual(
		await listAccessibleMailboxes(database.db, {
			userId: actors.b.id,
			organizationId,
		}),
		[],
	);
});
