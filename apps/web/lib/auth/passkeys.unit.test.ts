import assert from "node:assert/strict";
import { test } from "node:test";
import { hashToken } from "./csrf";
import {
	challengeMatchesHash,
	getWebAuthnConfig,
	isAuthenticationResponse,
	isRecentAuthentication,
	isRegistrationResponse,
	matchesUserHandle,
	passkeyChallengeLifetimeMs,
	recentAuthenticationLifetimeMs,
} from "./passkeys";

test("WebAuthn configuration binds RP ID and expected origin to exact app origin", () => {
	assert.deepEqual(getWebAuthnConfig("http://localhost:3100", "development"), {
		expectedOrigin: "http://localhost:3100",
		rpID: "localhost",
		rpName: "AI Webmail",
	});

	assert.throws(
		() => getWebAuthnConfig("http://localhost:3100", "production"),
		/exact HTTPS origin/,
	);

	assert.deepEqual(
		getWebAuthnConfig("https://mail.example.test", "production"),
		{
			expectedOrigin: "https://mail.example.test",
			rpID: "mail.example.test",
			rpName: "AI Webmail",
		},
	);

	assert.throws(
		() => getWebAuthnConfig("https://mail.example.test/path", "production"),
		/exact HTTPS origin/,
	);
});

test("passkey freshness and expiry constants enforce the five-minute gates", () => {
	const now = new Date("2026-10-08T12:00:00.000Z");
	assert.equal(passkeyChallengeLifetimeMs, 5 * 60 * 1000);
	assert.equal(recentAuthenticationLifetimeMs, 5 * 60 * 1000);
	assert.equal(
		isRecentAuthentication(
			new Date(now.getTime() - recentAuthenticationLifetimeMs),
			now,
		),
		true,
	);
	assert.equal(
		isRecentAuthentication(
			new Date(now.getTime() - recentAuthenticationLifetimeMs - 1),
			now,
		),
		false,
	);
	assert.equal(isRecentAuthentication(new Date(now.getTime() + 1), now), false);
});

test("stored challenges are compared by hash without retaining their value", async () => {
	const challenge = "synthetic-single-use-challenge";
	const verify = challengeMatchesHash(hashToken(challenge));
	assert.equal(await verify(challenge), true);
	assert.equal(await verify("different-challenge"), false);
});

test("credential response shapes and discoverable user handles are checked", () => {
	const registration = {
		id: "credential-id",
		rawId: "credential-id",
		type: "public-key",
		response: {},
	};
	assert.equal(isRegistrationResponse(registration), true);
	assert.equal(
		isRegistrationResponse({ ...registration, rawId: "different-id" }),
		false,
	);

	const assertion = {
		...registration,
		response: { userHandle: "opaque-user-handle" },
	};
	assert.equal(isAuthenticationResponse(assertion), true);
	if (isAuthenticationResponse(assertion)) {
		assert.equal(matchesUserHandle(assertion, "opaque-user-handle"), true);
		assert.equal(matchesUserHandle(assertion, "another-user-handle"), false);
	}
});
