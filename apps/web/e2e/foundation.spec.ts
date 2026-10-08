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

test("component gallery demonstrates both themes and passes automated accessibility checks", async ({
	page,
}) => {
	await page.goto("/design-system");

	await expect(
		page.getByRole("heading", {
			level: 1,
			name: "Tokens and component gallery",
		}),
	).toBeVisible();
	await expect(page.locator(".theme-panel")).toHaveCount(2);
	await expect(page.getByText("Keyboard focus", { exact: true })).toHaveCount(
		2,
	);
	await expect(page.getByText("Stale data", { exact: true })).toHaveCount(2);

	const focusExample = page.locator(".is-focus-demo").first();
	await focusExample.focus();
	await expect(focusExample).toBeFocused();
	expect(
		await focusExample.evaluate(
			(element) => getComputedStyle(element).boxShadow,
		),
	).not.toBe("none");

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

test("component gallery reflows without horizontal page overflow at target widths", async ({
	page,
}) => {
	await page.goto("/design-system");

	for (const width of [320, 375, 390, 768, 1024, 1280, 1440, 1920]) {
		await page.setViewportSize({ width, height: 900 });
		const dimensions = await page.evaluate(() => ({
			clientWidth: document.documentElement.clientWidth,
			scrollWidth: document.documentElement.scrollWidth,
		}));

		expect(
			dimensions.scrollWidth,
			`page overflows horizontally at ${width}px`,
		).toBeLessThanOrEqual(dimensions.clientWidth);
	}
});
