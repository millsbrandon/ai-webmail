import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { createDatabase } from "@ai-webmail/db/client";
import {
	mailboxes,
	organizationMemberships,
	organizations,
	pollJobs,
	users,
} from "@ai-webmail/db/schema";
import {
	suggestFolderMapping,
	syntheticFolders,
} from "@ai-webmail/domain/mailbox-setup";
import { count, eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { csrfCookieName, sessionCookieName } from "../../../lib/auth/csrf";
import { createSession } from "../../../lib/auth/sessions";
import { GET, POST } from "./route";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalOrigin = process.env.APP_ORIGIN;
if (!originalDatabaseUrl) throw new Error("DATABASE_URL is required.");
const url = new URL(originalDatabaseUrl);
url.pathname = "/webmail_test";
process.env.DATABASE_URL = url.toString();
process.env.APP_ORIGIN = "http://localhost:3000";
const database = createDatabase(url.toString());
const organizationId = randomUUID();
const otherId = randomUUID();
const actors = {
	owner: randomUUID(),
	administrator: randomUUID(),
	member: randomUUID(),
	outsider: randomUUID(),
};
const sessions = new Map<string, Awaited<ReturnType<typeof createSession>>>();
const settings = {
	displayName: "Synthetic preview",
	address: "team@example.test",
	historyDays: 30,
	folders: suggestFolderMapping(syntheticFolders),
};

before(async () => {
	await database.db.insert(organizations).values([
		{ id: organizationId, name: "Synthetic preview organization" },
		{ id: otherId, name: "Synthetic other organization" },
	]);
	for (const [role, id] of Object.entries(actors)) {
		await database.db.insert(users).values({
			id,
			userHandle: randomUUID(),
			email: `${id}@example.test`,
			displayName: "Synthetic actor",
			passwordHash: "synthetic-no-login",
		});
		await database.db.insert(organizationMemberships).values({
			userId: id,
			organizationId: role === "outsider" ? otherId : organizationId,
			role:
				role === "outsider"
					? "owner"
					: role === "owner"
						? "owner"
						: role === "administrator"
							? "administrator"
							: "member",
		});
		sessions.set(role, await createSession(database.db, id));
	}
});
after(async () => {
	await database.db
		.delete(organizations)
		.where(inArray(organizations.id, [organizationId, otherId]));
	await database.db
		.delete(users)
		.where(inArray(users.id, Object.values(actors)));
	await database.pool.end();
	const shared = globalThis.webmailDatabase;
	globalThis.webmailDatabase = undefined;
	await shared?.pool.end();
	process.env.DATABASE_URL = originalDatabaseUrl;
	if (originalOrigin === undefined) delete process.env.APP_ORIGIN;
	else process.env.APP_ORIGIN = originalOrigin;
});

function request(
	role?: string,
	method = "GET",
	body: unknown = { organizationId, settings },
	validCsrf = true,
	origin = "http://localhost:3000",
) {
	const session = role ? sessions.get(role) : undefined;
	return new NextRequest("http://localhost:3000/api/mailbox-setup", {
		method,
		headers: {
			origin,
			"Content-Type": "application/json",
			cookie: session
				? `${sessionCookieName}=${session.sessionToken}; ${csrfCookieName}=${session.csrfToken}`
				: "",
			"X-CSRF-Token": validCsrf && session ? session.csrfToken : "wrong",
		},
		body: method === "POST" ? JSON.stringify(body) : undefined,
	});
}

test("setup catalogs disclose only owned organizations and no secrets", async () => {
	assert.equal((await GET(request())).status, 401);
	for (const role of ["owner", "outsider", "administrator", "member"]) {
		const response = await GET(request(role));
		assert.equal(response.status, 200);
		assert.equal(response.headers.get("Cache-Control"), "no-store");
		const body = (await response.json()) as {
			organizations: { id: string }[];
			mode: string;
		};
		assert.equal(body.mode, "synthetic_preview");
		assert.deepEqual(
			body.organizations.map((organization) => organization.id),
			role === "owner"
				? [organizationId]
				: role === "outsider"
					? [otherId]
					: [],
		);
		assert.ok(
			!JSON.stringify(body).includes(
				sessions.get(role)?.sessionToken ?? "unexpected",
			),
		);
	}
});

test("preview requires exact origin, session CSRF, recent active authentication and organization ownership", async () => {
	assert.equal((await POST(request(undefined, "POST"))).status, 401);
	assert.equal(
		(await POST(request("owner", "POST", undefined, false))).status,
		403,
	);
	assert.equal(
		(
			await POST(
				request(
					"owner",
					"POST",
					undefined,
					true,
					"https://attacker.example.test",
				),
			)
		).status,
		403,
	);
	for (const role of ["administrator", "member", "outsider"]) {
		assert.equal((await POST(request(role, "POST"))).status, 403);
	}
	for (const id of [otherId, randomUUID(), "malformed"]) {
		const response = await POST(
			request("owner", "POST", { organizationId: id, settings }),
		);
		assert.equal(response.status, 403);
		assert.deepEqual(await response.json(), {
			error: "Setup is not available for this organization.",
		});
	}
	sessions.set(
		"stale",
		await createSession(
			database.db,
			actors.owner,
			new Date(Date.now() - 6 * 60_000),
		),
	);
	assert.equal((await POST(request("stale", "POST"))).status, 403);
});

test("preview validates fixture mapping, rejects secrets/oversized requests and does not provision jobs or mailboxes", async () => {
	const beforeCounts = await Promise.all([
		database.db
			.select({ count: count() })
			.from(mailboxes)
			.where(eq(mailboxes.organizationId, organizationId)),
		database.db
			.select({ count: count() })
			.from(pollJobs)
			.where(eq(pollJobs.organizationId, organizationId)),
	]);
	const response = await POST(request("owner", "POST"));
	assert.equal(response.status, 200);
	assert.deepEqual(await response.json(), {
		mode: "synthetic_preview",
		settings,
		providerVerified: false,
		persisted: false,
		sendingEnabled: false,
	});
	const duplicate = await POST(
		request("owner", "POST", {
			organizationId,
			settings: {
				...settings,
				folders: { ...settings.folders, trash: "Sent" },
			},
		}),
	);
	assert.equal(duplicate.status, 400);
	const realAddress = await POST(
		request("owner", "POST", {
			organizationId,
			settings: { ...settings, address: "team@example.com" },
		}),
	);
	assert.equal(realAddress.status, 400);
	const secret = await POST(
		request("owner", "POST", {
			organizationId,
			settings: { ...settings, password: "synthetic-secret-marker" },
		}),
	);
	assert.equal(secret.status, 400);
	assert.ok(
		!JSON.stringify(await secret.json()).includes("synthetic-secret-marker"),
	);
	const extra = await POST(
		request("owner", "POST", {
			organizationId,
			settings,
			password: "synthetic-secret-marker",
		}),
	);
	assert.equal(extra.status, 400);
	const oversized = await POST(
		request("owner", "POST", {
			organizationId,
			settings: { ...settings, displayName: "x".repeat(9000) },
		}),
	);
	assert.equal(oversized.status, 400);
	assert.deepEqual(
		await Promise.all([
			database.db
				.select({ count: count() })
				.from(mailboxes)
				.where(eq(mailboxes.organizationId, organizationId)),
			database.db
				.select({ count: count() })
				.from(pollJobs)
				.where(eq(pollJobs.organizationId, organizationId)),
		]),
		beforeCounts,
	);
});

test("owner revocation and disabled accounts immediately remove preview access", async () => {
	await database.db
		.delete(organizationMemberships)
		.where(eq(organizationMemberships.userId, actors.owner));
	assert.equal((await POST(request("owner", "POST"))).status, 403);
	await database.db
		.update(users)
		.set({ status: "disabled" })
		.where(eq(users.id, actors.outsider));
	assert.equal((await GET(request("outsider"))).status, 401);
	assert.equal(
		(
			await POST(
				request("outsider", "POST", { organizationId: otherId, settings }),
			)
		).status,
		401,
	);
});
