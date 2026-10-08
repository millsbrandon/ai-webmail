import assert from "node:assert/strict";
import { test } from "node:test";
import {
	csrfCookieName,
	hashToken,
	hasValidCsrf,
	hasValidOrigin,
	newCsrfToken,
} from "./csrf";
import {
	hashPassword,
	passwordPolicy,
	validatePassword,
	verifyPassword,
} from "./password";
import { readBoundedJsonBody } from "./request-body";

test("password policy accepts 15–128 Unicode characters within byte limits", async () => {
	assert.equal(validatePassword("12345678901234"), false);
	assert.equal(validatePassword("open-source-passphrase"), true);
	assert.equal(validatePassword("123456789012345"), false);
	assert.equal(validatePassword("PasswordPassword"), false);
	assert.equal(validatePassword("a".repeat(129)), false);
	assert.equal(validatePassword("😀".repeat(128)), true);
	assert.equal(passwordPolicy.maximumBytes, 1024);

	const password = "correct horse battery staple";
	const encoded = await hashPassword(password);
	assert.match(encoded, /^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
	assert.equal(await verifyPassword(password, encoded), true);
	assert.equal(await verifyPassword(`${password}!`, encoded), false);
});

test("unsafe passwords are rejected before Argon2 hashing", async () => {
	await assert.rejects(
		hashPassword("short"),
		/Password does not meet the account password policy/,
	);
});

test("CSRF validation requires the configured exact origin and a same-site double-submit token", () => {
	const previousOrigin = process.env.APP_ORIGIN;
	process.env.APP_ORIGIN = "https://mail.example.test";
	try {
		const token = newCsrfToken();
		const request = new Request("https://mail.example.test/api/auth/login", {
			headers: {
				cookie: `${csrfCookieName}=${token}`,
				origin: "https://mail.example.test",
				"x-csrf-token": token,
			},
		});

		assert.equal(hasValidOrigin(request), true);
		assert.equal(hasValidCsrf(request), true);
		assert.equal(hasValidCsrf(request, hashToken(token)), true);
		assert.equal(hasValidCsrf(request, hashToken(newCsrfToken())), false);

		const forgedOrigin = new Request(request.url, {
			headers: {
				cookie: `${csrfCookieName}=${token}`,
				origin: "https://evil.example.test",
				"x-csrf-token": token,
			},
		});
		assert.equal(hasValidOrigin(forgedOrigin), false);

		const pathOrigin = new Request(request.url, {
			headers: {
				cookie: `${csrfCookieName}=${token}`,
				origin: "https://mail.example.test/attacker-path",
				"x-csrf-token": token,
			},
		});
		assert.equal(hasValidOrigin(pathOrigin), false);

		const missingHeader = new Request(request.url, {
			headers: {
				cookie: `${csrfCookieName}=${token}`,
				origin: "https://mail.example.test",
			},
		});
		assert.equal(hasValidCsrf(missingHeader), false);
	} finally {
		if (previousOrigin === undefined) {
			delete process.env.APP_ORIGIN;
		} else {
			process.env.APP_ORIGIN = previousOrigin;
		}
	}
});

test("JSON request bodies are bounded and must be JSON objects", async () => {
	assert.deepEqual(
		await readBoundedJsonBody(
			new Request("http://localhost", {
				method: "POST",
				body: JSON.stringify({ email: "user@example.test" }),
			}),
			128,
		),
		{ ok: true, value: { email: "user@example.test" } },
	);
	assert.deepEqual(
		await readBoundedJsonBody(
			new Request("http://localhost", {
				method: "POST",
				body: "x".repeat(129),
			}),
			128,
		),
		{ ok: false, reason: "too_large" },
	);
	assert.deepEqual(
		await readBoundedJsonBody(
			new Request("http://localhost", { method: "POST", body: "[]" }),
			128,
		),
		{ ok: false, reason: "invalid_json" },
	);
});
