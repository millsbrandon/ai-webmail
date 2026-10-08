import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const stylesheet = readFileSync(
	new URL("../globals.css", import.meta.url),
	"utf8",
);

const contrastPairs = [
	{ foreground: "--text", background: "--canvas", minimum: 4.5 },
	{ foreground: "--text", background: "--surface", minimum: 4.5 },
	{ foreground: "--text-muted", background: "--canvas", minimum: 4.5 },
	{ foreground: "--text-muted", background: "--surface", minimum: 4.5 },
	{ foreground: "--text-muted", background: "--surface-muted", minimum: 4.5 },
	{ foreground: "--accent", background: "--canvas", minimum: 4.5 },
	{ foreground: "--accent", background: "--surface", minimum: 4.5 },
	{ foreground: "--danger-text", background: "--canvas", minimum: 4.5 },
	{ foreground: "--danger-text", background: "--surface", minimum: 4.5 },
	{ foreground: "--on-accent", background: "--accent", minimum: 4.5 },
	{ foreground: "--selected-text", background: "--selected-bg", minimum: 4.5 },
	{ foreground: "--success-text", background: "--success-bg", minimum: 4.5 },
	{ foreground: "--warning-text", background: "--warning-bg", minimum: 4.5 },
	{ foreground: "--danger-text", background: "--danger-bg", minimum: 4.5 },
	{ foreground: "--ai-text", background: "--ai-bg", minimum: 4.5 },
	{ foreground: "--text-muted", background: "--success-bg", minimum: 4.5 },
	{ foreground: "--text-muted", background: "--warning-bg", minimum: 4.5 },
	{ foreground: "--text-muted", background: "--danger-bg", minimum: 4.5 },
	{ foreground: "--text-muted", background: "--ai-bg", minimum: 4.5 },
	{ foreground: "--border-control", background: "--canvas", minimum: 3 },
	{ foreground: "--border-control", background: "--surface", minimum: 3 },
	{
		foreground: "--accent",
		background: "--canvas",
		minimum: 3,
		label: "focus ring",
	},
	{
		foreground: "--accent",
		background: "--surface",
		minimum: 3,
		label: "focus ring",
	},
] as const;

function parseTokens(block: string | undefined) {
	assert.ok(block, "theme token declaration block exists");

	return Object.fromEntries(
		[...block.matchAll(/(--[\w-]+):\s*(#[\da-f]{6})\s*;/gi)].map(
			([, name, value]) => [name, value],
		),
	);
}

function luminance(hex: string) {
	const channels = hex
		.slice(1)
		.match(/.{2}/g)
		?.map((channel) => Number.parseInt(channel, 16) / 255);
	assert.ok(channels, `valid RGB token ${hex}`);

	const linear = channels.map((channel) =>
		channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
	);

	return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function ratio(foreground: string, background: string) {
	const values = [luminance(foreground), luminance(background)].sort(
		(a, b) => b - a,
	);

	return (values[0] + 0.05) / (values[1] + 0.05);
}

const themeBlocks = {
	light: /:root,\s*\[data-theme="light"\]\s*\{([^}]*)\}/.exec(stylesheet)?.[1],
	dark: /\[data-theme="dark"\]\s*\{([^}]*)\}/.exec(stylesheet)?.[1],
};

test("semantic text, control, and focus token pairs meet WCAG contrast minimums", () => {
	const report: string[] = [];

	for (const [theme, block] of Object.entries(themeBlocks)) {
		const tokens = parseTokens(block);

		for (const pair of contrastPairs) {
			const foreground = tokens[pair.foreground];
			const background = tokens[pair.background];
			assert.ok(foreground, `${theme} defines ${pair.foreground}`);
			assert.ok(background, `${theme} defines ${pair.background}`);

			const measured = ratio(foreground, background);
			const pairName =
				"label" in pair
					? pair.label
					: `${pair.foreground} on ${pair.background}`;
			report.push(`${theme}: ${pairName} ${measured.toFixed(2)}:1`);
			assert.ok(
				measured >= pair.minimum,
				`${theme} ${pairName} is ${measured.toFixed(2)}:1; expected at least ${pair.minimum}:1`,
			);
		}
	}

	console.info(`\nWCAG token contrast report\n${report.join("\n")}`);
});
