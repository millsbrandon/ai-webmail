import { randomUUID } from "node:crypto";
import { createDatabase } from "@ai-webmail/db/client";
import {
	authSessions,
	invitations,
	loginAttempts,
	users,
} from "@ai-webmail/db/schema";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { csrfCookieName, hashToken } from "../lib/auth/csrf";
import { createInvitation } from "../lib/auth/invitations";

test("invitation, generic login failures, session, and logout work in the browser", async ({
	page,
}) => {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error("DATABASE_URL must be configured for end-to-end tests.");
	}
	const testDatabaseUrl = new URL(connectionString);
	testDatabaseUrl.pathname = "/webmail_test";
	const database = createDatabase(testDatabaseUrl.toString());
	const email = `auth-e2e-${randomUUID()}@example.test`;
	const password = "a synthetic e2e password";

	try {
		const invitation = await createInvitation(database.db, email, null);
		await page.goto(`/invite/${invitation.token}`);
		await expect(
			page.getByRole("heading", { name: "Create your account" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Accept invitation" }),
		).toBeEnabled();
		const cookies = await page.context().cookies();
		expect(cookies.some((cookie) => cookie.name === csrfCookieName)).toBe(true);
		const invitationA11y = await new AxeBuilder({ page })
			.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
			.analyze();
		expect(invitationA11y.violations).toEqual([]);

		await page.getByLabel("Invited email").fill(email);
		await page.getByLabel("Display name").fill("Synthetic E2E User");
		await page.getByLabel("Password", { exact: true }).fill(password);
		await page.getByRole("button", { name: "Accept invitation" }).click();
		await expect(
			page.getByText("Your account is ready. Sign in to continue."),
		).toBeVisible();
		await page.getByRole("link", { name: "Continue to sign in" }).click();
		await expect(
			page.getByRole("button", { name: "Sign in with a passkey" }),
		).toBeEnabled();
		const loginA11y = await new AxeBuilder({ page })
			.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
			.analyze();
		expect(loginA11y.violations).toEqual([]);

		await page.getByLabel("Email").fill(email);
		await page
			.getByLabel("Password", { exact: true })
			.fill("incorrect password");
		await page.getByRole("button", { name: "Sign in", exact: true }).click();
		await expect(
			page.getByText("Email or password is incorrect.", { exact: true }),
		).toBeVisible();
		expect(await page.locator("body").innerText()).not.toContain(email);

		await page.getByLabel("Password", { exact: true }).fill(password);
		await page.getByRole("button", { name: "Sign in", exact: true }).click();
		await expect(
			page.getByText("Signed in as Synthetic E2E User."),
		).toBeVisible();
		await page.getByRole("button", { name: "Sign out" }).click();
		await expect(
			page.getByRole("button", { name: "Sign in with a passkey" }),
		).toBeEnabled();
		const sessionStatus = await page.evaluate(async () => {
			const response = await fetch("/api/auth/session", { cache: "no-store" });
			return response.status;
		});
		expect(sessionStatus).toBe(401);
	} finally {
		const [user] = await database.db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.email, email))
			.limit(1);
		if (user) {
			await database.db
				.delete(authSessions)
				.where(eq(authSessions.userId, user.id));
			await database.db.delete(users).where(eq(users.id, user.id));
		}
		await database.db.delete(invitations).where(eq(invitations.email, email));
		await database.db
			.delete(loginAttempts)
			.where(eq(loginAttempts.accountHash, hashToken(email)));
		await database.pool.end();
	}
});
