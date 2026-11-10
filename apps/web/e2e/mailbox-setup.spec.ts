import { randomUUID } from "node:crypto";
import { createDatabase } from "@ai-webmail/db/client";
import {
	organizationMemberships,
	organizations,
	users,
} from "@ai-webmail/db/schema";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/auth/password";

test("owner can preview folder mappings without provisioning or a provider connection", async ({
	page,
}) => {
	if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
	const url = new URL(process.env.DATABASE_URL);
	url.pathname = "/webmail_test";
	const database = createDatabase(url.toString());
	const userId = randomUUID();
	const organizationId = randomUUID();
	const password = "Synthetic mailbox setup browser password";
	try {
		await database.db.insert(users).values({
			id: userId,
			userHandle: randomUUID(),
			email: `${userId}@example.test`,
			displayName: "Synthetic setup owner",
			passwordHash: await hashPassword(password),
		});
		await database.db
			.insert(organizations)
			.values({ id: organizationId, name: "Synthetic setup organization" });
		await database.db
			.insert(organizationMemberships)
			.values({ userId, organizationId, role: "owner" });
		await page.goto("/login");
		await page.getByLabel("Email").fill(`${userId}@example.test`);
		await page.getByLabel("Password", { exact: true }).fill(password);
		await page.getByRole("button", { name: "Sign in", exact: true }).click();
		await expect(
			page.getByText("Signed in as Synthetic setup owner."),
		).toBeVisible();
		const externalRequests: string[] = [];
		page.on("request", (request) => {
			if (new URL(request.url()).hostname !== "localhost")
				externalRequests.push(new URL(request.url()).hostname);
		});
		await page
			.getByRole("link", {
				name: "Preview synthetic mailbox setup (owners only)",
			})
			.click();
		await expect(page.getByLabel("Organization")).toHaveValue(organizationId);
		const checkWidths = async () => {
			for (const width of [320, 375, 390, 768, 1024, 1280, 1440, 1920]) {
				await page.setViewportSize({ width, height: 900 });
				expect(
					await page.evaluate(() => document.documentElement.scrollWidth),
				).toBeLessThanOrEqual(width);
			}
		};
		await checkWidths();
		await page.getByLabel("Mailbox name").fill("Synthetic team mailbox");
		await page.getByLabel("Synthetic email address").fill("team@example.test");
		await page.getByLabel("Initial history window").selectOption("90");
		await page.getByRole("button", { name: "Next: folder mapping" }).click();
		await expect(page.getByLabel("Sent folder")).toHaveValue("Sent");
		await checkWidths();
		expect(
			(
				await new AxeBuilder({ page })
					.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
					.analyze()
			).violations,
		).toEqual([]);
		await page.getByLabel("Trash folder").selectOption("Sent");
		await page.getByRole("button", { name: "Check preview" }).click();
		await expect(
			page.getByText("Each folder role must use a different folder."),
		).toBeVisible();
		await page.getByLabel("Trash folder").selectOption("Trash");
		await page.getByRole("button", { name: "Check preview" }).click();
		await expect(
			page.getByText(
				"Preview checked. Provider not verified. Nothing saved. Sending disabled.",
			),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Review synthetic preview" }),
		).toBeFocused();
		await checkWidths();
		expect(
			(
				await new AxeBuilder({ page })
					.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
					.analyze()
			).violations,
		).toEqual([]);
		await page.setViewportSize({ width: 320, height: 900 });
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth),
		).toBeLessThanOrEqual(320);
		await page.getByRole("button", { name: "Edit preview" }).click();
		await expect(page.getByLabel("Mailbox name")).toHaveValue(
			"Synthetic team mailbox",
		);
		expect(externalRequests).toEqual([]);
	} finally {
		await database.db
			.delete(organizations)
			.where(eq(organizations.id, organizationId));
		await database.db.delete(users).where(eq(users.id, userId));
		await database.pool.end();
	}
});

test("setup page explains unauthenticated access without exposing a catalog", async ({
	page,
}) => {
	await page.goto("/mailbox-setup");
	await expect(
		page.getByText("Authentication required.", { exact: true }),
	).toBeVisible();
	await expect(page.getByLabel("Organization")).toHaveCount(0);
});
