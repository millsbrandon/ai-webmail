import { randomUUID } from "node:crypto";
import { createDatabase } from "@ai-webmail/db/client";
import {
	auditEvents,
	invitations,
	loginAttempts,
	users,
} from "@ai-webmail/db/schema";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { hashToken, sessionCookieName } from "../lib/auth/csrf";
import { acceptInvitation, createInvitation } from "../lib/auth/invitations";
import { createSession } from "../lib/auth/sessions";

test("session settings revoke individual and other sessions while preserving this browser", async ({
	page,
	request,
}) => {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL must be configured for end-to-end tests.");
	}
	const url = new URL(process.env.DATABASE_URL);
	url.pathname = "/webmail_test";
	const database = createDatabase(url.toString());
	const email = `w12-browser-${randomUUID()}@example.test`;
	const password = "a synthetic session browser password";
	let userId: string | undefined;
	try {
		const invitation = await createInvitation(database.db, email, null);
		expect(
			await acceptInvitation(
				database.db,
				invitation.token,
				email,
				"Synthetic Session User",
				password,
			),
		).toBe(true);
		const [user] = await database.db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.email, email));
		userId = user.id;
		const individual = await createSession(database.db, userId, new Date(), {
			deviceLabel: "Firefox on Linux",
		});
		const other = await createSession(database.db, userId, new Date(), {
			deviceLabel: "Safari on iOS/iPadOS",
		});
		await page.goto("/login");
		await page.getByLabel("Email").fill(email);
		await page.getByLabel("Password", { exact: true }).fill(password);
		await page.getByRole("button", { name: "Sign in", exact: true }).click();
		await expect(
			page.getByRole("heading", { name: "Active sessions" }),
		).toBeVisible();
		await expect(page.getByText(/Current session/)).toBeVisible();
		await expect(
			page.getByRole("button", {
				name: "Sign out Firefox on Linux",
				exact: true,
			}),
		).toBeVisible();
		for (const width of [320, 375, 390, 768, 1024, 1280, 1440, 1920]) {
			await page.setViewportSize({ width, height: 900 });
			const dimensions = await page.evaluate(() => ({
				clientWidth: document.documentElement.clientWidth,
				scrollWidth: document.documentElement.scrollWidth,
			}));
			expect(
				dimensions.scrollWidth,
				`session settings overflow at ${width}px`,
			).toBeLessThanOrEqual(dimensions.clientWidth);
		}
		expect(
			(
				await new AxeBuilder({ page })
					.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
					.analyze()
			).violations,
		).toEqual([]);
		await page
			.getByRole("button", { name: "Sign out Firefox on Linux", exact: true })
			.click();
		await expect(
			page.getByRole("button", {
				name: "Sign out Firefox on Linux",
				exact: true,
			}),
		).toHaveCount(0);
		const invalidated = await request.get("/api/auth/session", {
			headers: { Cookie: `${sessionCookieName}=${individual.sessionToken}` },
		});
		expect(invalidated.status()).toBe(401);
		await page
			.getByRole("button", { name: "Sign out other sessions", exact: true })
			.click();
		await expect(
			page.getByRole("button", {
				name: "Sign out Safari on iOS/iPadOS",
				exact: true,
			}),
		).toHaveCount(0);
		await expect(
			page.getByRole("button", {
				name: "Sign out other sessions",
				exact: true,
			}),
		).toBeDisabled();
		expect(
			(
				await request.get("/api/auth/session", {
					headers: { Cookie: `${sessionCookieName}=${other.sessionToken}` },
				})
			).status(),
		).toBe(401);
		expect(
			await page.evaluate(
				async () =>
					(await fetch("/api/auth/session", { cache: "no-store" })).status,
			),
		).toBe(200);
		const events = await database.db
			.select()
			.from(auditEvents)
			.where(
				and(
					eq(auditEvents.actorUserId, userId),
					eq(auditEvents.action, "sessions.revoked_others"),
				),
			);
		expect(events).toHaveLength(1);
		expect(events[0].actorSessionId).toBeTruthy();
		expect(events[0].outcome).toBe("success");
	} finally {
		if (userId) await database.db.delete(users).where(eq(users.id, userId));
		await database.db.delete(invitations).where(eq(invitations.email, email));
		await database.db
			.delete(loginAttempts)
			.where(eq(loginAttempts.accountHash, hashToken(email)));
		await database.pool.end();
	}
});
