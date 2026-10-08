import { randomBytes } from "node:crypto";
import argon2 from "argon2";

export const passwordPolicy = {
	minimumCharacters: 15,
	maximumCharacters: 128,
	maximumBytes: 1024,
} as const;

const argon2Options = {
	type: argon2.argon2id,
	memoryCost: 19 * 1024,
	timeCost: 2,
	parallelism: 1,
} as const;

const commonPasswords = new Set(
	[
		"123456789012345",
		"adminadminadmin",
		"changemechangeme",
		"iloveyouiloveyou",
		"letmeinletmein",
		"passwordpassword",
		"qwertyuiopasdfg",
		"trustno1trustno1",
		"welcome12345678",
	].map((password) => password.toLowerCase()),
);

let dummyHashPromise: Promise<string> | undefined;

export function validatePassword(password: string) {
	const characters = Array.from(password).length;
	const bytes = Buffer.byteLength(password, "utf8");

	return (
		characters >= passwordPolicy.minimumCharacters &&
		characters <= passwordPolicy.maximumCharacters &&
		bytes <= passwordPolicy.maximumBytes &&
		!commonPasswords.has(password.toLowerCase())
	);
}

export async function hashPassword(password: string) {
	if (!validatePassword(password)) {
		throw new Error("Password does not meet the account password policy.");
	}

	return argon2.hash(password, argon2Options);
}

export async function verifyPassword(password: string, encodedHash: string) {
	return argon2.verify(encodedHash, password);
}

export function verifyUnknownAccountPassword(password: string) {
	dummyHashPromise ??= argon2.hash(randomBytes(32), argon2Options);

	return dummyHashPromise.then((dummyHash) =>
		verifyPassword(password, dummyHash),
	);
}
