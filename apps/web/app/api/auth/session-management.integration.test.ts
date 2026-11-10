import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { createDatabase } from "@ai-webmail/db/client";
import {
	auditEvents,
	authSessions,
	organizationMemberships,
	organizations,
	users,
} from "@ai-webmail/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import {
	csrfCookieName,
	hashToken,
	sessionCookieName,
} from "../../../lib/auth/csrf";
import {
	disableOrganizationUser,
	SessionManagementError,
} from "../../../lib/auth/session-management";
import {
	createSession,
	getActiveSession,
	InactiveUserError,
} from "../../../lib/auth/sessions";
import { POST as disable } from "../organizations/[organizationId]/users/[userId]/disable/route";
import { DELETE as revoke } from "./sessions/[sessionId]/route";
import { GET as list, DELETE as revokeOthers } from "./sessions/route";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalAppOrigin = process.env.APP_ORIGIN;
if (!originalDatabaseUrl) {
	throw new Error("DATABASE_URL is required for session-management tests.");
}
const url = new URL(originalDatabaseUrl);
url.pathname = "/webmail_test";
process.env.DATABASE_URL = url.toString();
process.env.APP_ORIGIN = "http://localhost:3000";
const database = createDatabase(url.toString());
const organizationId = randomUUID();
const otherOrganizationId = randomUUID();
const userIds = {
	owner: randomUUID(),
	member: randomUUID(),
	admin: randomUUID(),
	outsider: randomUUID(),
	shared: randomUUID(),
};
type IssuedSession = Awaited<ReturnType<typeof createSession>>;
const sessions = new Map<string, IssuedSession>();

function actor(name: keyof typeof userIds) {
	const session = sessions.get(name);
	assert.ok(session);
	return session;
}

function request(
	session?: IssuedSession,
	method = "GET",
	validCsrf = true,
	origin = "http://localhost:3000",
) {
	return new NextRequest("http://localhost:3000/api/auth/sessions", {
		method,
		headers: {
			origin,
			cookie: session
				? `${sessionCookieName}=${session.sessionToken}; ${csrfCookieName}=${session.csrfToken}`
				: "",
			"x-csrf-token": validCsrf && session ? session.csrfToken : "incorrect",
		},
	});
}

async function idOf(session: IssuedSession) {
	const active = await getActiveSession(database.db, session.sessionToken);
	assert.ok(active);
	return active.id;
}

function disableRequest(
	name: keyof typeof userIds,
	targetUserId: string,
	orgId = organizationId,
) {
	return disable(request(actor(name), "POST"), {
		params: Promise.resolve({ organizationId: orgId, userId: targetUserId }),
	});
}

before(async () => {
	await database.db.insert(organizations).values([
		{ id: organizationId, name: "Synthetic session organization" },
		{
			id: otherOrganizationId,
			name: "Synthetic separate session organization",
		},
	]);
	for (const [name, id] of Object.entries(userIds)) {
		await database.db.insert(users).values({
			id,
			userHandle: randomUUID(),
			email: `w12-${id}@example.test`,
			displayName: `Synthetic ${name}`,
			passwordHash: "synthetic-no-login",
		});
		await database.db.insert(organizationMemberships).values({
			organizationId:
				name === "outsider" ? otherOrganizationId : organizationId,
			userId: id,
			role:
				name === "owner"
					? "owner"
					: name === "admin"
						? "administrator"
						: "member",
		});
		sessions.set(name, await createSession(database.db, id));
	}
	await database.db.insert(organizationMemberships).values({
		organizationId: otherOrganizationId,
		userId: userIds.shared,
		role: "member",
	});
});

after(async () => {
	await database.db
		.delete(organizations)
		.where(inArray(organizations.id, [organizationId, otherOrganizationId]));
	await database.db
		.delete(users)
		.where(inArray(users.id, Object.values(userIds)));
	await database.pool.end();
	const shared = globalThis.webmailDatabase;
	globalThis.webmailDatabase = undefined;
	await shared?.pool.end();
	process.env.DATABASE_URL = originalDatabaseUrl;
	if (originalAppOrigin === undefined) delete process.env.APP_ORIGIN;
	else process.env.APP_ORIGIN = originalAppOrigin;
});

test("session lists exclude other users and never disclose authentication secrets", async () => {
	const response = await list(request(actor("member")));
	assert.equal(response.status, 200);
	assert.equal(response.headers.get("Cache-Control"), "no-store");
	const body = (await response.json()) as {
		sessions: { id: string; current: boolean }[];
	};
	assert.equal(body.sessions.length, 1);
	assert.equal(body.sessions[0].current, true);
	assert.equal(body.sessions[0].id, await idOf(actor("member")));
	const serialized = JSON.stringify(body);
	assert.ok(!serialized.includes(actor("member").sessionToken));
	assert.ok(!serialized.includes(actor("member").csrfToken));
	assert.ok(!serialized.includes("tokenHash"));
	assert.equal((await list(request())).status, 401);
});

test("revoking another user's session or a guessed ID fails without revoking anything", async () => {
	for (const id of [await idOf(actor("owner")), randomUUID(), "malformed"]) {
		const response = await revoke(request(actor("member"), "DELETE"), {
			params: Promise.resolve({ sessionId: id }),
		});
		assert.equal(response.status, 404);
		assert.deepEqual(await response.json(), { error: "Session not found." });
	}
	assert.ok(await getActiveSession(database.db, actor("owner").sessionToken));
});

test("mutations require exact origin, session CSRF, and recent authentication", async () => {
	const stale = await createSession(
		database.db,
		userIds.member,
		new Date(Date.now() - 6 * 60 * 1000),
	);
	assert.equal((await revokeOthers(request(stale, "DELETE"))).status, 403);
	assert.equal(
		(await revokeOthers(request(actor("member"), "DELETE", false))).status,
		403,
	);
	assert.equal(
		(
			await revokeOthers(
				request(
					actor("member"),
					"DELETE",
					true,
					"https://attacker.example.test",
				),
			)
		).status,
		403,
	);
	assert.ok(await getActiveSession(database.db, stale.sessionToken));
});

test("individual and all-other revocation are immediate, attributable, and keep the actor session", async () => {
	const other = await createSession(database.db, userIds.member);
	const otherId = await idOf(other);
	const result = await revoke(request(actor("member"), "DELETE"), {
		params: Promise.resolve({ sessionId: otherId }),
	});
	assert.equal(result.status, 200);
	assert.equal(
		await getActiveSession(database.db, other.sessionToken),
		undefined,
	);
	const [event] = await database.db
		.select()
		.from(auditEvents)
		.where(
			and(
				eq(auditEvents.action, "session.revoked"),
				eq(auditEvents.targetId, otherId),
			),
		);
	assert.equal(event.actorUserId, userIds.member);
	assert.equal(event.actorSessionId, await idOf(actor("member")));
	assert.ok(event.correlationId);
	const extra = await createSession(database.db, userIds.member);
	assert.equal(
		(await revokeOthers(request(actor("member"), "DELETE"))).status,
		200,
	);
	assert.equal(
		await getActiveSession(database.db, extra.sessionToken),
		undefined,
	);
	assert.ok(await getActiveSession(database.db, actor("member").sessionToken));
	assert.ok(await getActiveSession(database.db, actor("owner").sessionToken));
});

test("a rolled-back transaction cannot leave a session or its audit event behind", async () => {
	let sessionId: string | undefined;
	await assert.rejects(
		database.db.transaction(async (transaction) => {
			const created = await createSession(transaction, userIds.owner);
			sessionId = created.id;
			throw new Error("Synthetic transaction rollback.");
		}),
		/Synthetic transaction rollback/,
	);
	assert.ok(sessionId);
	assert.deepEqual(
		await database.db
			.select()
			.from(authSessions)
			.where(eq(authSessions.id, sessionId)),
		[],
	);
	assert.deepEqual(
		await database.db
			.select()
			.from(auditEvents)
			.where(eq(auditEvents.targetId, sessionId)),
		[],
	);
});

test("owner administration rejects ordinary/admin users, other tenants, owners, and shared accounts", async () => {
	assert.equal((await disableRequest("member", userIds.admin)).status, 403);
	assert.equal((await disableRequest("admin", userIds.member)).status, 403);
	assert.equal((await disableRequest("owner", userIds.outsider)).status, 404);
	assert.equal(
		(await disableRequest("owner", userIds.member, otherOrganizationId)).status,
		403,
	);
	assert.equal((await disableRequest("owner", userIds.owner)).status, 409);
	assert.equal((await disableRequest("owner", userIds.shared)).status, 409);
	const staleOwner = await createSession(
		database.db,
		userIds.owner,
		new Date(Date.now() - 6 * 60 * 1000),
	);
	await assert.rejects(
		disableOrganizationUser(
			database.db,
			staleOwner.sessionToken,
			organizationId,
			userIds.member,
		),
		(error: unknown) =>
			error instanceof SessionManagementError && error.status === 403,
	);
});

test("account disable revokes every session and concurrent login cannot escape invalidation", async () => {
	const secondary = await createSession(database.db, userIds.member);
	const outcomes = await Promise.allSettled([
		createSession(database.db, userIds.member),
		disableOrganizationUser(
			database.db,
			actor("owner").sessionToken,
			organizationId,
			userIds.member,
		),
	]);
	assert.equal(outcomes[1].status, "fulfilled");
	if (outcomes[0].status === "fulfilled") {
		assert.equal(
			await getActiveSession(database.db, outcomes[0].value.sessionToken),
			undefined,
		);
	} else {
		assert.ok(outcomes[0].reason instanceof InactiveUserError);
	}
	assert.equal(
		await getActiveSession(database.db, secondary.sessionToken),
		undefined,
	);
	assert.equal((await list(request(actor("member")))).status, 401);
	await assert.rejects(
		createSession(database.db, userIds.member),
		InactiveUserError,
	);
	const rows = await database.db
		.select()
		.from(authSessions)
		.where(eq(authSessions.userId, userIds.member));
	assert.ok(rows.every((session) => session.revokedAt !== null));
	const [event] = await database.db
		.select()
		.from(auditEvents)
		.where(
			and(
				eq(auditEvents.action, "user.disabled"),
				eq(auditEvents.targetId, userIds.member),
			),
		);
	assert.equal(event.actorUserId, userIds.owner);
	assert.equal(event.organizationId, organizationId);
	assert.equal(event.actorSessionId, await idOf(actor("owner")));
});

test("runtime role cannot update, delete, or truncate attributable audit records", async () => {
	const events = await database.db
		.select()
		.from(auditEvents)
		.where(eq(auditEvents.actorUserId, userIds.owner));
	assert.ok(events.length > 0);
	const privilege = await database.db.execute<{ allowed: boolean }>(
		sql`SELECT has_table_privilege(current_user, 'app.audit_events', 'TRUNCATE') AS allowed`,
	);
	assert.equal(privilege.rows[0].allowed, false);
	for (const mutation of [
		() =>
			database.db
				.update(auditEvents)
				.set({ targetId: "tampered" })
				.where(eq(auditEvents.id, events[0].id)),
		() =>
			database.db.delete(auditEvents).where(eq(auditEvents.id, events[0].id)),
	]) {
		await assert.rejects(
			mutation(),
			(error: unknown) =>
				error instanceof Error &&
				typeof error.cause === "object" &&
				error.cause !== null &&
				"code" in error.cause &&
				error.cause.code === "42501",
		);
	}
	const [preserved] = await database.db
		.select()
		.from(auditEvents)
		.where(eq(auditEvents.id, events[0].id));
	assert.equal(preserved.targetId, events[0].targetId);
	assert.ok(
		!JSON.stringify(events).includes(hashToken(actor("owner").sessionToken)),
	);
});
