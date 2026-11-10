import { randomUUID } from "node:crypto";
import { createDatabase } from "@ai-webmail/db/client";
import {
	mailboxes,
	mailboxMemberships,
	organizationMemberships,
	organizations,
	users,
} from "@ai-webmail/db/schema";
import { expect, test } from "@playwright/test";
import { and, eq, inArray } from "drizzle-orm";
import { sessionCookieName } from "../lib/auth/csrf";
import { createSession } from "../lib/auth/sessions";

test("HTTP mailbox routes enforce session, tenant, capability, and revocation boundaries", async ({
	request,
}) => {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL must be configured for end-to-end tests.");
	}
	const url = new URL(process.env.DATABASE_URL);
	url.pathname = "/webmail_test";
	const database = createDatabase(url.toString());
	const organizationId = randomUUID();
	const otherOrganizationId = randomUUID();
	const userId = randomUUID();
	const infoId = randomUUID();
	const managerId = randomUUID();
	const prefix = `/api/organizations/${organizationId}/mailboxes`;
	try {
		await database.db.insert(organizations).values([
			{ id: organizationId, name: "Synthetic HTTP organization" },
			{ id: otherOrganizationId, name: "Synthetic HTTP isolated organization" },
		]);
		await database.db.insert(users).values({
			id: userId,
			userHandle: randomUUID(),
			email: `w11-http-${userId}@example.test`,
			displayName: "Synthetic HTTP member",
			passwordHash: "synthetic-no-password-login",
		});
		await database.db.insert(organizationMemberships).values({
			organizationId,
			userId,
			role: "member",
		});
		await database.db.insert(mailboxes).values([
			{
				id: infoId,
				organizationId,
				address: "info@example.test",
				displayName: "Synthetic Info",
			},
			{
				id: managerId,
				organizationId,
				address: "manager@example.test",
				displayName: "Synthetic Manager",
			},
		]);
		await database.db.insert(mailboxMemberships).values({
			organizationId,
			userId,
			mailboxId: infoId,
			role: "viewer",
		});
		const session = await createSession(database.db, userId);
		const headers = { Cookie: `${sessionCookieName}=${session.sessionToken}` };

		expect((await request.get(prefix)).status()).toBe(401);
		const list = await request.get(prefix, { headers });
		expect(list.status()).toBe(200);
		expect(list.headers()["cache-control"]).toBe("no-store");
		expect(await list.json()).toEqual({
			mailboxes: [
				{
					id: infoId,
					organizationId,
					address: "info@example.test",
					displayName: "Synthetic Info",
					capabilities: ["read"],
				},
			],
		});
		const own = await request.get(`${prefix}/${infoId}`, { headers });
		expect(own.status()).toBe(200);
		expect(own.headers()["cache-control"]).toBe("no-store");
		for (const id of [managerId, randomUUID(), "not-a-uuid"]) {
			const denied = await request.get(`${prefix}/${id}`, { headers });
			expect(denied.status()).toBe(404);
			expect(await denied.json()).toEqual({ error: "Mailbox not found." });
		}
		const crossed = await request.get(
			`/api/organizations/${otherOrganizationId}/mailboxes/${infoId}`,
			{ headers },
		);
		expect(crossed.status()).toBe(404);
		expect(
			await (
				await request.get(
					`/api/organizations/${otherOrganizationId}/mailboxes`,
					{ headers },
				)
			).json(),
		).toEqual({ mailboxes: [] });

		await database.db
			.delete(mailboxMemberships)
			.where(
				and(
					eq(mailboxMemberships.organizationId, organizationId),
					eq(mailboxMemberships.mailboxId, infoId),
					eq(mailboxMemberships.userId, userId),
				),
			);
		expect(
			(await request.get(`${prefix}/${infoId}`, { headers })).status(),
		).toBe(404);
		expect(await (await request.get(prefix, { headers })).json()).toEqual({
			mailboxes: [],
		});
	} finally {
		await database.db
			.delete(organizations)
			.where(inArray(organizations.id, [organizationId, otherOrganizationId]));
		await database.db.delete(users).where(eq(users.id, userId));
		await database.pool.end();
	}
});
