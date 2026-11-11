import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const viewportWidths = [320, 375, 390, 768, 1024, 1280, 1440, 1920];
const axeTags = [
	"wcag2a",
	"wcag2aa",
	"wcag21a",
	"wcag21aa",
	"wcag22aa",
	"best-practice",
];

test("keeps the synthetic inbox within target widths and themes", async ({
	page,
}, testInfo) => {
	await page.goto("/mail/demo/inbox");

	await expect(
		page.getByRole("heading", { level: 1, name: "Inbox" }),
	).toBeVisible();
	await expect(
		page.getByText(
			"Development preview. All people and messages are fictional.",
		),
	).toBeVisible();
	await expect(
		page.getByText(
			"This is fictional content for the local webmail layout preview.",
		),
	).toHaveCount(0);

	for (const theme of ["light", "dark"] as const) {
		await page.emulateMedia({ colorScheme: theme });

		for (const width of viewportWidths) {
			await page.setViewportSize({ width, height: 900 });
			const dimensions = await page.evaluate(() => {
				const workspace =
					document.querySelector<HTMLElement>(".mail-workspace");
				const header = document.querySelector<HTMLElement>(".mail-header");
				const headerActions = header?.querySelector<HTMLElement>(
					".mail-header-actions",
				);
				const content = document.querySelector<HTMLElement>(".mail-content");
				return {
					clientWidth: document.documentElement.clientWidth,
					scrollWidth: document.documentElement.scrollWidth,
					background: workspace
						? getComputedStyle(workspace).backgroundColor
						: "",
					headerBottom: header?.getBoundingClientRect().bottom ?? -1,
					headerActionsBottom:
						headerActions?.getBoundingClientRect().bottom ?? -1,
					contentTop: content?.getBoundingClientRect().top ?? -1,
				};
			});

			expect(
				dimensions.scrollWidth,
				`page overflows horizontally at ${width}px in ${theme} theme`,
			).toBeLessThanOrEqual(dimensions.clientWidth);
			expect(
				dimensions.headerActionsBottom,
				`header actions overlap the content at ${width}px in ${theme} theme`,
			).toBeLessThanOrEqual(dimensions.headerBottom);
			expect(
				dimensions.contentTop,
				`mail content starts before the header ends at ${width}px in ${theme} theme`,
			).toBeGreaterThanOrEqual(dimensions.headerBottom);
			expect(dimensions.background).toBe(
				theme === "light" ? "rgb(248, 250, 252)" : "rgb(11, 18, 32)",
			);
			await page.screenshot({
				fullPage: true,
				path: testInfo.outputPath(`inbox-${theme}-${width}.png`),
			});
		}
	}

	await page.emulateMedia({ colorScheme: "light" });
	await page.setViewportSize({ width: 1440, height: 900 });
	const inboxA11y = await new AxeBuilder({ page }).withTags(axeTags).analyze();
	expect(inboxA11y.violations).toEqual([]);

	await page
		.getByRole("button", { name: "Toggle light and dark themes" })
		.click();
	await expect(page.locator(".mail-workspace")).toHaveAttribute(
		"data-theme",
		"dark",
	);
	await page
		.getByRole("button", { name: "Toggle light and dark themes" })
		.click();
	await expect(page.locator(".mail-workspace")).toHaveAttribute(
		"data-theme",
		"light",
	);
});

test("opens a thread and restores the inbox scroll position on return", async ({
	page,
}) => {
	await page.setViewportSize({ width: 375, height: 812 });
	await page.goto("/mail/demo/inbox");

	const list = page.locator(".mail-list-scroll");
	await list.evaluate((element) => {
		element.scrollTop = element.scrollHeight;
	});
	const scrollBefore = await list.evaluate((element) => element.scrollTop);
	expect(scrollBefore).toBeGreaterThan(0);

	await page
		.getByRole("link", {
			name: "Open thread: A suggestion for the help center from Sage Murphy",
		})
		.click();
	await expect(
		page.getByRole("heading", {
			level: 1,
			name: "A suggestion for the help center",
		}),
	).toBeVisible();
	await expect(list).toBeHidden();
	await expect(
		page.getByText(
			"This is fictional content for the local webmail layout preview.",
		),
	).toBeVisible();
	await expect(
		page.getByText("From Support <support@example.invalid>"),
	).toBeVisible();

	const threadA11y = await new AxeBuilder({ page }).withTags(axeTags).analyze();
	expect(threadA11y.violations).toEqual([]);

	await page.getByRole("link", { name: "Back to inbox" }).click();
	await expect(page).toHaveURL(/\/mail\/demo\/inbox$/);
	await expect(list).toBeVisible();
	expect(await list.evaluate((element) => element.scrollTop)).toBe(
		scrollBefore,
	);

	await list.evaluate((element) => {
		element.scrollTop = 0;
	});
	await page
		.getByRole("link", {
			name: "Open thread: A quick update on the delivery from Riley Park",
		})
		.click();
	await expect(
		page.getByText("Internal note — not sent to customer"),
	).toBeVisible();
});

test("supports keyboard navigation and a focus-managed mailbox drawer", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/mail/demo/inbox");

	await page.keyboard.press("Tab");
	await expect(page.getByRole("link", { name: "Skip to inbox" })).toBeFocused();
	await expect(page.getByRole("link", { name: "Skip to inbox" })).toHaveCSS(
		"box-shadow",
		/rgb/,
	);
	await page.keyboard.press("Tab");
	await expect(
		page.getByRole("button", { name: "Open mailbox navigation" }),
	).toBeFocused();
	await page.keyboard.press("Enter");

	const dialog = page.getByRole("dialog", { name: "Mailbox navigation" });
	await expect(dialog).toBeVisible();
	await expect(page.getByRole("button", { name: "Close" })).toBeFocused();
	await page.keyboard.press("Escape");
	await expect(dialog).not.toBeVisible();
	await expect(
		page.getByRole("button", { name: "Open mailbox navigation" }),
	).toBeFocused();
});
