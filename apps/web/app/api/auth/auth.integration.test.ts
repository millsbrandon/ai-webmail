import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, test } from "node:test";
import { createDatabase } from "@ai-webmail/db/client";
import {
	authSessions,
	invitations,
	loginAttempts,
	users,
} from "@ai-webmail/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import {
	csrfCookieName,
	hashToken,
	sessionCookieName,
} from "../../../lib/auth/csrf";
import {
	acceptInvitation,
	createInvitation,
} from "../../../lib/auth/invitations";
import { authenticate, loginPolicy } from "../../../lib/auth/login";
import {
	getActiveSession,
	idleSessionMs,
	revokeSession,
} from "../../../lib/auth/sessions";
import { GET as getCsrf } from "./csrf/route";
import { POST as acceptInvite } from "./invitations/accept/route";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { GET as getSession } from "./session/route";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalAppOrigin = process.env.APP_ORIGIN;
const appOrigin = "http://localhost:3000";
const password = "correct horse battery staple";
const testDbUrl = originalDatabaseUrl
	? new URL(originalDatabaseUrl)
	: undefined;

if (testDbUrl) {
	testDbUrl.pathname = "/webmail_test";
	process.env.DATABASE_URL = testDbUrl.toString();
}
process.env.APP_ORIGIN = appOrigin;

const database = testDbUrl ? createDatabase(testDbUrl.toString()) : undefined;
const syntheticEmails: string[] = [];

function uniqueEmail() {
	const email = `auth-${crypto.randomUUID()}@example.test`;
	syntheticEmails.push(email);
	return email;
}

function csrfRequest(
	path: string,
	token: string,
	body?: Record<string, string>,
	sessionToken?: string,
) {
	return new NextRequest(`${appOrigin}${path}`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			cookie: [
				`${csrfCookieName}=${token}`,
				...(sessionToken ? [`${sessionCookieName}=${sessionToken}`] : []),
			].join("; "),
			origin: appOrigin,
			"x-csrf-token": token,
		},
		body: body ? JSON.stringify(body) : undefined,
	});
}

function csrfGetRequest(token?: string) {
	return new NextRequest(`${appOrigin}/api/auth/csrf`, {
		headers: token ? { cookie: `${csrfCookieName}=${token}` } : undefined,
	});
}

after(async () => {
	if (database) {
		for (const email of syntheticEmails) {
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
		}
		await database.pool.end();
	}

	const sharedDatabase = globalThis.webmailDatabase;
	globalThis.webmailDatabase = undefined;
	await sharedDatabase?.pool.end();

	if (originalDatabaseUrl === undefined) {
		delete process.env.DATABASE_URL;
	} else {
		process.env.DATABASE_URL = originalDatabaseUrl;
	}
	if (originalAppOrigin === undefined) {
		delete process.env.APP_ORIGIN;
	} else {
		process.env.APP_ORIGIN = originalAppOrigin;
	}
});

test("invite redemption creates one account and passwords authenticate without enumeration", async () => {
	assert.ok(database, "DATABASE_URL must be set for auth integration tests.");
	const email = uniqueEmail();
	const issued = await createInvitation(database.db, email.toUpperCase(), null);
	const csrfResponse = await getCsrf(csrfGetRequest());
	const csrfToken = (await csrfResponse.json()).csrfToken as string;
	const reusedCsrfResponse = await getCsrf(csrfGetRequest(csrfToken));
	assert.equal((await reusedCsrfResponse.json()).csrfToken, csrfToken);

	const accepted = await acceptInvite(
		csrfRequest("/api/auth/invitations/accept", csrfToken, {
			token: issued.token,
			email: email.toUpperCase(),
			displayName: "  Synthetic User ",
			password,
		}),
	);
	assert.equal(accepted.status, 200);
	assert.deepEqual(await accepted.json(), { status: "invitation_accepted" });

	const replay = await acceptInvitation(
		database.db,
		issued.token,
		email,
		"Another Name",
		password,
	);
	assert.equal(replay, false);

	const [createdUser] = await database.db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.limit(1);
	assert.equal(createdUser.displayName, "Synthetic User");
	assert.match(
		createdUser.passwordHash,
		/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/,
	);

	const csrfAfterInvite = await getCsrf(csrfGetRequest());
	const loginCsrf = (await csrfAfterInvite.json()).csrfToken as string;
	const successfulLogin = await login(
		csrfRequest("/api/auth/login", loginCsrf, { email, password }),
	);
	assert.equal(successfulLogin.status, 200);
	const loginBody = (await successfulLogin.json()) as {
		csrfToken: string;
		user: { displayName: string };
	};
	assert.equal(loginBody.user.displayName, "Synthetic User");
	assert.equal(
		JSON.stringify(loginBody).includes(createdUser.passwordHash),
		false,
	);

	const sessionToken = successfulLogin.cookies.get(sessionCookieName)?.value;
	assert.ok(sessionToken);
	const session = await getSession(
		new NextRequest(`${appOrigin}/api/auth/session`, {
			headers: { cookie: `${sessionCookieName}=${sessionToken}` },
		}),
	);
	assert.equal(session.status, 200);
	assert.deepEqual(await session.json(), {
		status: "authenticated",
		user: { email, displayName: "Synthetic User" },
	});

	const signedOut = await logout(
		csrfRequest(
			"/api/auth/logout",
			loginBody.csrfToken,
			undefined,
			sessionToken,
		),
	);
	assert.equal(signedOut.status, 200);
	assert.deepEqual(await signedOut.json(), { status: "signed_out" });

	const revokedSession = await getSession(
		new NextRequest(`${appOrigin}/api/auth/session`, {
			headers: { cookie: `${sessionCookieName}=${sessionToken}` },
		}),
	);
	assert.equal(revokedSession.status, 401);
});

test("unknown and incorrect credentials return the same generic response and account attempts cool down", async () => {
	assert.ok(database);
	const email = uniqueEmail();
	const invitation = await createInvitation(database.db, email, null);
	assert.equal(
		await acceptInvitation(
			database.db,
			invitation.token,
			email,
			"Synthetic",
			password,
		),
		true,
	);

	const wrongPassword = await authenticate(
		database.db,
		email,
		"incorrect password for this account",
	);
	const unknownEmail = uniqueEmail();
	const unknownAccount = await authenticate(
		database.db,
		unknownEmail,
		"incorrect password for this account",
	);
	assert.equal(wrongPassword, undefined);
	assert.equal(unknownAccount, undefined);

	const csrfResponse = await getCsrf(csrfGetRequest());
	const csrfToken = (await csrfResponse.json()).csrfToken as string;
	const wrongLogin = await login(
		csrfRequest("/api/auth/login", csrfToken, {
			email,
			password: "incorrect password for this account",
		}),
	);
	const unknownLogin = await login(
		csrfRequest("/api/auth/login", csrfToken, {
			email: unknownEmail,
			password: "incorrect password for this account",
		}),
	);
	assert.equal(wrongLogin.status, 401);
	assert.equal(unknownLogin.status, 401);
	assert.deepEqual(await wrongLogin.json(), await unknownLogin.json());

	const lockEmail = uniqueEmail();
	const cooldownInvitation = await createInvitation(
		database.db,
		lockEmail,
		null,
	);
	assert.equal(
		await acceptInvitation(
			database.db,
			cooldownInvitation.token,
			lockEmail,
			"Cooldown User",
			password,
		),
		true,
	);
	const fixedNow = new Date();
	for (let count = 0; count < 5; count += 1) {
		assert.equal(
			await authenticate(
				database.db,
				lockEmail,
				"incorrect password for this account",
				fixedNow,
			),
			undefined,
		);
	}

	const lockKey = createHashEmail(lockEmail);
	const [attempt] = await database.db
		.select()
		.from(loginAttempts)
		.where(eq(loginAttempts.accountHash, lockKey))
		.limit(1);
	assert.ok(attempt.lockedUntil);
	assert.ok(attempt.lockedUntil > fixedNow);
	assert.equal(
		await authenticate(database.db, lockEmail, password, fixedNow),
		undefined,
	);
	const afterCooldown = new Date(fixedNow.getTime() + loginPolicy.lockoutMs);
	assert.equal(
		await authenticate(
			database.db,
			lockEmail,
			"incorrect password for this account",
			afterCooldown,
		),
		undefined,
	);
	const [resetAttempt] = await database.db
		.select()
		.from(loginAttempts)
		.where(eq(loginAttempts.accountHash, lockKey))
		.limit(1);
	assert.equal(resetAttempt.failedAttempts, 1);
	assert.equal(resetAttempt.lockedUntil, null);
	assert.ok(
		await authenticate(database.db, lockEmail, password, afterCooldown),
	);
});

test("sessions enforce idle expiry, absolute expiry, revocation, and origin/CSRF checks", async () => {
	assert.ok(database);
	const email = uniqueEmail();
	const issued = await createInvitation(database.db, email, null);
	assert.equal(
		await acceptInvitation(
			database.db,
			issued.token,
			email,
			"Session User",
			password,
		),
		true,
	);
	const [user] = await database.db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	const started = new Date();
	const authentication = await authenticate(
		database.db,
		email,
		password,
		started,
	);
	assert.ok(authentication);
	const active = await getActiveSession(
		database.db,
		authentication.session.sessionToken,
		new Date(started.getTime() + idleSessionMs + 1000),
	);
	assert.equal(active, undefined);

	const absoluteExpiry = await authenticate(
		database.db,
		email,
		password,
		started,
	);
	assert.ok(absoluteExpiry);
	assert.equal(
		await getActiveSession(
			database.db,
			absoluteExpiry.session.sessionToken,
			new Date(absoluteExpiry.session.absoluteExpiresAt.getTime() + 1000),
		),
		undefined,
	);

	await revokeSession(database.db, authentication.session.sessionToken);
	assert.equal(
		await getActiveSession(database.db, authentication.session.sessionToken),
		undefined,
	);
	assert.ok(user);

	const invalidOrigin = await login(
		new NextRequest(`${appOrigin}/api/auth/login`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				cookie: `${csrfCookieName}=${authentication.session.csrfToken}`,
				origin: "https://attacker.example.test",
				"x-csrf-token": authentication.session.csrfToken,
			},
			body: JSON.stringify({ email, password }),
		}),
	);
	assert.equal(invalidOrigin.status, 403);

	const invalidCsrf = await login(
		csrfRequest("/api/auth/login", "invalid-token", { email, password }),
	);
	assert.equal(invalidCsrf.status, 403);
});

test("concurrent invitation redemption can create only one account", async () => {
	assert.ok(database);
	const email = uniqueEmail();
	const issued = await createInvitation(database.db, email, null);
	const redemptions = await Promise.all([
		acceptInvitation(database.db, issued.token, email, "First", password),
		acceptInvitation(database.db, issued.token, email, "Second", password),
	]);

	assert.equal(redemptions.filter(Boolean).length, 1);
	const matchingUsers = await database.db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email));
	assert.equal(matchingUsers.length, 1);
});

test("expired invitations cannot create accounts", async () => {
	assert.ok(database);
	const email = uniqueEmail();
	const expiry = new Date(Date.now() - 24 * 60 * 60 * 1000 - 1000);
	const issued = await createInvitation(database.db, email, null, expiry);
	assert.equal(
		await acceptInvitation(
			database.db,
			issued.token,
			email,
			"Expired",
			password,
		),
		false,
	);
	const matchingUsers = await database.db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email));
	assert.equal(matchingUsers.length, 0);
});

function createHashEmail(email: string) {
	return createHash("sha256").update(email).digest("hex");
}
