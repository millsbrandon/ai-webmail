import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { after, before, test } from "node:test";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { createDatabase } from "@ai-webmail/db/client";
import { mailboxes, organizations, pollJobs } from "@ai-webmail/db/schema";
import { eq } from "drizzle-orm";
import {
	claimPoll,
	completePoll,
	enqueueSyntheticPoll,
	failPoll,
	LostPollLeaseError,
	leaseDurationMs,
	maximumPollAttempts,
	pollIntervalMs,
	runSyntheticPollCycle,
} from "./poll-queue";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const url = new URL(process.env.DATABASE_URL);
url.pathname = "/webmail_test";
const database = createDatabase(url.toString());
const organizationId = randomUUID();
const mailboxId = randomUUID();
const start = new Date("2026-01-01T00:00:00Z");

before(async () => {
	await database.db
		.insert(organizations)
		.values({ id: organizationId, name: "Synthetic queue test" });
	await database.db.insert(mailboxes).values({
		id: mailboxId,
		organizationId,
		displayName: "Synthetic queue",
		address: `${mailboxId}@example.test`,
	});
});
after(async () => {
	await database.db
		.delete(organizations)
		.where(eq(organizations.id, organizationId));
	await database.pool.end();
});
async function reset() {
	await database.db.delete(pollJobs).where(eq(pollJobs.mailboxId, mailboxId));
	await enqueueSyntheticPoll(database.db, organizationId, mailboxId, start);
}
async function row() {
	const [job] = await database.db
		.select()
		.from(pollJobs)
		.where(eq(pollJobs.mailboxId, mailboxId));
	assert.ok(job);
	return job;
}

test("enqueue is transactional and duplicate keys preserve the original schedule", async () => {
	await reset();
	await Promise.all(
		Array.from({ length: 10 }, () =>
			enqueueSyntheticPoll(database.db, organizationId, mailboxId, new Date()),
		),
	);
	assert.equal((await row()).dueAt.getTime(), start.getTime());
	await database.db.delete(pollJobs).where(eq(pollJobs.mailboxId, mailboxId));
	await assert.rejects(
		database.db.transaction(async (transaction) => {
			await enqueueSyntheticPoll(transaction, organizationId, mailboxId, start);
			throw new Error("Synthetic rollback");
		}),
		/Synthetic rollback/,
	);
	assert.deepEqual(
		await database.db
			.select()
			.from(pollJobs)
			.where(eq(pollJobs.mailboxId, mailboxId)),
		[],
	);
});

test("120 empty cycles retain one durable job, honor the 60-second schedule and make zero fetch requests", async () => {
	await reset();
	const originalFetch = globalThis.fetch;
	let requests = 0;
	globalThis.fetch = async () => {
		requests++;
		throw new Error("No external requests are permitted in empty cycles.");
	};
	try {
		for (let cycle = 0; cycle < 120; cycle++) {
			const now = new Date(start.getTime() + cycle * pollIntervalMs);
			assert.equal(await runSyntheticPollCycle(database.db, now), true);
			assert.equal(
				await claimPoll(
					database.db,
					new Date(now.getTime() + pollIntervalMs - 1),
				),
				undefined,
			);
		}
		assert.equal(requests, 0);
		const rows = await database.db
			.select()
			.from(pollJobs)
			.where(eq(pollJobs.mailboxId, mailboxId));
		assert.equal(rows.length, 1);
		assert.equal(
			rows[0].dueAt.getTime(),
			start.getTime() + 120 * pollIntervalMs,
		);
		assert.equal(rows[0].attempts, 0);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("concurrent consumers claim once; restart recovers an expired lease and fences its old owner", async () => {
	await reset();
	const results = await Promise.all(
		Array.from({ length: 8 }, () => claimPoll(database.db, start)),
	);
	const leases = results.filter((value) => value !== undefined);
	assert.equal(leases.length, 1);
	const old = leases[0];
	assert.equal(
		await claimPoll(
			database.db,
			new Date(start.getTime() + leaseDurationMs - 1),
		),
		undefined,
	);
	await assert.rejects(
		completePoll(database.db, old, new Date(start.getTime() + leaseDurationMs)),
		LostPollLeaseError,
	);
	const restarted = createDatabase(url.toString());
	try {
		const now = new Date(start.getTime() + leaseDurationMs);
		const next = await claimPoll(restarted.db, now);
		assert.ok(next);
		assert.notEqual(next.leaseToken, old.leaseToken);
		await assert.rejects(
			completePoll(database.db, old, now),
			LostPollLeaseError,
		);
		await assert.rejects(failPoll(database.db, old, now), LostPollLeaseError);
		await completePoll(restarted.db, next, now);
		assert.equal((await row()).state, "ready");
	} finally {
		await restarted.pool.end();
	}
});

test("bounded retries back off with jitter, end in failure and do not retain arbitrary error text", async () => {
	await reset();
	for (let attempt = 1; attempt <= maximumPollAttempts; attempt++) {
		const now = (await row()).dueAt;
		const lease = await claimPoll(database.db, now);
		assert.ok(lease);
		assert.equal(lease.attempts, attempt);
		await failPoll(database.db, lease, now);
		const updated = await row();
		const base = 1000 * 2 ** (attempt - 1);
		assert.ok(updated.dueAt.getTime() >= now.getTime() + base);
		assert.ok(updated.dueAt.getTime() < now.getTime() + base * 1.25);
		assert.equal(updated.lastError, "processor_failed");
	}
	assert.equal((await row()).state, "failed");
	assert.equal(await claimPoll(database.db, new Date()), undefined);
});

test("a locked mailbox job does not block claiming another due mailbox", async () => {
	await reset();
	const secondId = randomUUID();
	await database.db.insert(mailboxes).values({
		id: secondId,
		organizationId,
		displayName: "Synthetic second queue",
		address: `${secondId}@example.test`,
	});
	await enqueueSyntheticPoll(database.db, organizationId, secondId, start);
	let release = () => {};
	const released = new Promise<void>((resolve) => {
		release = resolve;
	});
	let acquired = () => {};
	const locked = new Promise<void>((resolve) => {
		acquired = resolve;
	});
	const holding = database.db.transaction(async (transaction) => {
		await transaction
			.select()
			.from(pollJobs)
			.where(eq(pollJobs.mailboxId, mailboxId))
			.for("update");
		acquired();
		await released;
	});
	let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
	try {
		await locked;
		const claimed = await Promise.race([
			claimPoll(database.db, start),
			new Promise<never>((_, reject) => {
				timer = globalThis.setTimeout(
					() => reject(new Error("SKIP LOCKED claim blocked.")),
					3000,
				);
			}),
		]);
		assert.ok(claimed);
		assert.equal(claimed.mailboxId, secondId);
		await completePoll(database.db, claimed, start);
	} finally {
		clearTimeout(timer);
		release();
		await holding;
		await database.db.delete(mailboxes).where(eq(mailboxes.id, secondId));
	}
});

test("repeated crashes exhaust the attempt budget without granting a sixth lease", async () => {
	await reset();
	for (let attempt = 0; attempt < maximumPollAttempts; attempt++) {
		assert.ok(
			await claimPoll(
				database.db,
				new Date(start.getTime() + attempt * leaseDurationMs),
			),
		);
	}
	assert.equal(
		await claimPoll(
			database.db,
			new Date(start.getTime() + maximumPollAttempts * leaseDurationMs),
		),
		undefined,
	);
	assert.equal((await row()).state, "failed");
	assert.equal((await row()).lastError, "lease_expired");
});

test("disabled mailboxes are not claimed; tenant mismatch is rejected and the empty processor reschedules", async () => {
	await reset();
	await database.db
		.update(mailboxes)
		.set({ status: "disabled" })
		.where(eq(mailboxes.id, mailboxId));
	assert.equal(await claimPoll(database.db, new Date()), undefined);
	await database.db
		.update(mailboxes)
		.set({ status: "active" })
		.where(eq(mailboxes.id, mailboxId));
	await assert.rejects(
		enqueueSyntheticPoll(database.db, randomUUID(), mailboxId),
		(error: unknown) =>
			error instanceof Error &&
			error.cause instanceof Error &&
			"code" in error.cause &&
			error.cause.code === "23503",
	);
	assert.equal(await runSyntheticPollCycle(database.db), true);
	assert.ok((await row()).dueAt.getTime() > Date.now());
	assert.equal(await runSyntheticPollCycle(database.db), false);
});

test("worker processes resume durable schedules after restart and shut down cleanly", async () => {
	await reset();
	for (let run = 0; run < 2; run++) {
		const child = spawn(
			process.execPath,
			[
				"--import",
				"tsx",
				fileURLToPath(
					new URL("../../../apps/worker/src/main.ts", import.meta.url),
				),
			],
			{
				env: { ...process.env, DATABASE_URL: url.toString() },
				stdio: ["ignore", "pipe", "pipe"],
			},
		);
		let output = "";
		child.stdout.on("data", (chunk) => {
			output += chunk.toString();
		});
		child.stderr.on("data", (chunk) => {
			output += chunk.toString();
		});
		const exit = once(child, "exit");
		const killTimer = globalThis.setTimeout(
			() => child.kill("SIGKILL"),
			15_000,
		);
		try {
			const deadline = Date.now() + 10_000;
			while (
				!output.includes("Worker started") ||
				!(await row()).lastSucceededAt
			) {
				assert.equal(child.exitCode, null, output);
				assert.ok(Date.now() < deadline, "Worker failed to become ready.");
				await setTimeout(25);
			}
			const beforeStop = await row();
			assert.equal(beforeStop.state, "ready");
			child.kill("SIGTERM");
			const [code] = await exit;
			assert.equal(code, 0, output);
			assert.ok(output.includes("Worker stopped."));
			assert.equal((await row()).dueAt.getTime(), beforeStop.dueAt.getTime());
		} finally {
			clearTimeout(killTimer);
			if (child.exitCode === null && child.signalCode === null) {
				child.kill("SIGKILL");
				await exit;
			}
		}
	}
});
