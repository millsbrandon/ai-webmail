import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("shows the unconnected foundation landing page", async ({ page }) => {
	await page.goto("/");

	await expect(
		page.getByRole("heading", { level: 1, name: "AI Webmail" }),
	).toBeVisible();
	await expect(
		page.getByText("Foundation build — no mailbox data is connected.", {
			exact: true,
		}),
	).toBeVisible();
});

test("runs the landing page against the test database", async ({ request }) => {
	const response = await request.get("/api/health");

	expect(response.status()).toBe(200);
	await expect(response).toBeOK();
	expect(await response.json()).toEqual({ status: "ok" });
});

test("has no automated WCAG 2.2 A/AA or best-practice violations", async ({
	page,
}) => {
	await page.goto("/");

	const results = await new AxeBuilder({ page })
		.withTags([
			"wcag2a",
			"wcag2aa",
			"wcag21a",
			"wcag21aa",
			"wcag22aa",
			"best-practice",
		])
		.analyze();

	expect(results.violations).toEqual([]);
});
