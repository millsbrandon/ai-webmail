import { randomUUID } from "node:crypto";
import { createDatabase } from "@ai-webmail/db/client";
import {
	authSessions,
	invitations,
	loginAttempts,
	passkeyChallenges,
	users,
} from "@ai-webmail/db/schema";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { hashToken } from "../lib/auth/csrf";
import { createInvitation } from "../lib/auth/invitations";

test("password sign-in remains available when WebAuthn is unavailable", async ({
	page,
}) => {
	await page.addInitScript(() => {
		Object.defineProperty(window, "PublicKeyCredential", {
			configurable: true,
			value: undefined,
		});
	});
	await page.goto("/login");
	await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Sign in with a passkey" }),
	).toHaveCount(0);
	await expect(page.getByLabel("Email")).toBeVisible();
	await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
});

test("passkey sign-in is available when assertion works but registration does not", async ({
	page,
}) => {
	await page.addInitScript(() => {
		Object.defineProperty(window, "PublicKeyCredential", {
			configurable: true,
			value: () => undefined,
		});
		Object.defineProperty(navigator, "credentials", {
			configurable: true,
			value: { get: async () => undefined },
		});
	});
	await page.goto("/login");
	await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Sign in with a passkey" }),
	).toBeVisible();
	await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
});

test("virtual WebAuthn exercises passkey registration, sign-in, removal, and recovery", async ({
	page,
}) => {
	test.setTimeout(60_000);
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		throw new Error("DATABASE_URL must be configured for end-to-end tests.");
	}
	const testDatabaseUrl = new URL(connectionString);
	testDatabaseUrl.pathname = "/webmail_test";
	const database = createDatabase(testDatabaseUrl.toString());
	const email = `passkey-e2e-${randomUUID()}@example.test`;
	const password = "a synthetic passkey e2e password";
	const challengeIds: string[] = [];
	const client = await page.context().newCDPSession(page);
	let authenticatorId: string | undefined;

	try {
		await client.send("WebAuthn.enable");
		const authenticator = await client.send(
			"WebAuthn.addVirtualAuthenticator",
			{
				options: {
					protocol: "ctap2",
					transport: "internal",
					hasResidentKey: true,
					hasUserVerification: true,
					isUserVerified: true,
					automaticPresenceSimulation: true,
				},
			},
		);
		authenticatorId = authenticator.authenticatorId;

		const invitation = await createInvitation(database.db, email, null);
		await page.goto(`/invite/${invitation.token}`);
		await page.getByLabel("Invited email").fill(email);
		await page.getByLabel("Display name").fill("Synthetic Passkey User");
		await page.getByLabel("Password", { exact: true }).fill(password);
		await page.getByRole("button", { name: "Accept invitation" }).click();
		await page.getByRole("link", { name: "Continue to sign in" }).click();

		await page.getByLabel("Email").fill(email);
		await page.getByLabel("Password", { exact: true }).fill(password);
		await page.getByRole("button", { name: "Sign in", exact: true }).click();
		await expect(
			page.getByRole("heading", { name: "Passkeys and recovery" }),
		).toBeVisible();
		await expect(page.getByLabel("Name for new passkey")).toBeVisible();
		const securityA11y = await new AxeBuilder({ page })
			.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
			.analyze();
		expect(securityA11y.violations).toEqual([]);

		await page.getByLabel("Name for new passkey").fill("Virtual test device");
		const registrationOptionsResponse = page.waitForResponse((response) =>
			response.url().endsWith("/api/auth/passkeys/registration/options"),
		);
		await page.getByRole("button", { name: "Add passkey" }).click();
		const registrationOptions = await registrationOptionsResponse;
		challengeIds.push(
			((await registrationOptions.json()) as { challengeId: string })
				.challengeId,
		);
		await expect(
			page.getByText("Passkey added.", { exact: true }),
		).toBeVisible();
		await expect(
			page.getByText(/Virtual test device — single-device/),
		).toBeVisible();

		const credentials = await client.send("WebAuthn.getCredentials", {
			authenticatorId,
		});
		expect(credentials.credentials).toHaveLength(1);

		await page.getByRole("button", { name: "Sign out" }).click();
		const authenticationOptionsResponse = page.waitForResponse((response) =>
			response.url().endsWith("/api/auth/passkeys/authentication/options"),
		);
		const authenticationVerifyResponse = page.waitForResponse((response) =>
			response.url().endsWith("/api/auth/passkeys/authentication/verify"),
		);
		await page.getByRole("button", { name: "Sign in with a passkey" }).click();
		const authenticationOptions = await authenticationOptionsResponse;
		challengeIds.push(
			((await authenticationOptions.json()) as { challengeId: string })
				.challengeId,
		);
		const verifyResponse = await authenticationVerifyResponse;
		expect(
			verifyResponse.status(),
			JSON.stringify(await verifyResponse.json()),
		).toBe(200);
		await expect(
			page.getByText("Signed in as Synthetic Passkey User."),
		).toBeVisible();
		const passkeySessionStatus = await page.evaluate(async () => {
			const response = await fetch("/api/auth/session", { cache: "no-store" });
			return response.status;
		});
		expect(passkeySessionStatus).toBe(200);

		await page.getByRole("button", { name: "Create recovery codes" }).click();
		await expect(
			page.getByText("Save these codes now. They will not be shown again."),
		).toBeVisible();
		const recoveryCode = (
			await page.locator("ol code").first().innerText()
		).trim();
		expect(recoveryCode).toMatch(/^[a-f0-9]{32}$/);

		await page.getByRole("button", { name: "Sign out" }).click();
		await page.getByRole("button", { name: "Use a recovery code" }).click();
		await page.getByLabel("One-time recovery code").fill(recoveryCode);
		await page
			.getByRole("button", { name: "Sign in with recovery code" })
			.click();
		await expect(
			page.getByText("Signed in as Synthetic Passkey User."),
		).toBeVisible();

		await page
			.getByRole("button", { name: "Remove Virtual test device" })
			.click();
		await expect(
			page.getByText("No passkeys are registered.", { exact: true }),
		).toBeVisible();

		await page.getByRole("button", { name: "Sign out" }).click();
		await page.getByLabel("One-time recovery code").fill(recoveryCode);
		await page
			.getByRole("button", { name: "Sign in with recovery code" })
			.click();
		await expect(
			page.getByText("Recovery code is incorrect or has already been used."),
		).toBeVisible();
		const failedRecoverySessionStatus = await page.evaluate(async () => {
			const response = await fetch("/api/auth/session", { cache: "no-store" });
			return response.status;
		});
		expect(failedRecoverySessionStatus).toBe(401);
	} finally {
		if (authenticatorId) {
			await client.send("WebAuthn.removeVirtualAuthenticator", {
				authenticatorId,
			});
		}
		await client.detach();

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
		if (challengeIds.length > 0) {
			await database.db
				.delete(passkeyChallenges)
				.where(inArray(passkeyChallenges.id, challengeIds));
		}
		await database.pool.end();
	}
});
