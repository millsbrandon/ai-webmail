import { randomUUID } from "node:crypto";
import type { WebmailDatabase } from "@ai-webmail/db/client";
import { mailboxes, pollJobs } from "@ai-webmail/db/schema";
import { and, eq, gt, lte, or, sql } from "drizzle-orm";

export const pollIntervalMs = 60_000;
export const leaseDurationMs = 30_000;
export const maximumPollAttempts = 5;

type QueueDatabase = Pick<WebmailDatabase, "insert">;
export type PollLease = typeof pollJobs.$inferSelect & { leaseToken: string };

export class LostPollLeaseError extends Error {
	constructor() {
		super("The poll lease expired or was replaced.");
	}
}

export async function enqueueSyntheticPoll(
	db: QueueDatabase,
	organizationId: string,
	mailboxId: string,
	dueAt = new Date(),
) {
	await db
		.insert(pollJobs)
		.values({
			organizationId,
			mailboxId,
			kind: "synthetic.poll",
			dueAt,
		})
		.onConflictDoNothing({
			target: [pollJobs.organizationId, pollJobs.mailboxId],
		});
}

export async function claimPoll(
	db: WebmailDatabase,
	now = new Date(),
): Promise<PollLease | undefined> {
	return db.transaction(async (transaction) => {
		const [candidate] = await transaction
			.select({ job: pollJobs })
			.from(pollJobs)
			.innerJoin(
				mailboxes,
				and(
					eq(mailboxes.organizationId, pollJobs.organizationId),
					eq(mailboxes.id, pollJobs.mailboxId),
				),
			)
			.where(
				and(
					eq(mailboxes.status, "active"),
					or(
						and(eq(pollJobs.state, "ready"), lte(pollJobs.dueAt, now)),
						and(
							eq(pollJobs.state, "running"),
							lte(pollJobs.leaseExpiresAt, now),
						),
					),
				),
			)
			.orderBy(pollJobs.dueAt, pollJobs.id)
			.limit(1)
			.for("update", { skipLocked: true });
		if (!candidate) return undefined;
		const job = candidate.job;
		if (job.attempts >= maximumPollAttempts) {
			await transaction
				.update(pollJobs)
				.set({
					state: "failed",
					leaseToken: null,
					leaseExpiresAt: null,
					lastError: "lease_expired",
				})
				.where(eq(pollJobs.id, job.id));
			return undefined;
		}
		const leaseToken = randomUUID();
		const [claimed] = await transaction
			.update(pollJobs)
			.set({
				state: "running",
				leaseToken,
				leaseExpiresAt: new Date(now.getTime() + leaseDurationMs),
				attempts: job.attempts + 1,
				lastError: job.state === "running" ? "lease_expired" : job.lastError,
			})
			.where(eq(pollJobs.id, job.id))
			.returning();
		return { ...claimed, leaseToken };
	});
}

function ownedLease(lease: PollLease, now: Date) {
	return and(
		eq(pollJobs.id, lease.id),
		eq(pollJobs.organizationId, lease.organizationId),
		eq(pollJobs.mailboxId, lease.mailboxId),
		eq(pollJobs.state, "running"),
		eq(pollJobs.leaseToken, lease.leaseToken),
		gt(pollJobs.leaseExpiresAt, now),
	);
}

export async function completePoll(
	db: WebmailDatabase,
	lease: PollLease,
	now = new Date(),
) {
	const rows = await db
		.update(pollJobs)
		.set({
			state: "ready",
			dueAt: new Date(now.getTime() + pollIntervalMs),
			attempts: 0,
			leaseToken: null,
			leaseExpiresAt: null,
			lastError: null,
			lastSucceededAt: now,
		})
		.where(ownedLease(lease, now))
		.returning({ id: pollJobs.id });
	if (rows.length !== 1) throw new LostPollLeaseError();
}

export async function failPoll(
	db: WebmailDatabase,
	lease: PollLease,
	now = new Date(),
) {
	const backoffMs = Math.min(15 * 60_000, 1000 * 2 ** (lease.attempts - 1));
	const jitterMs = Math.floor((Math.random() * backoffMs) / 4);
	const rows = await db
		.update(pollJobs)
		.set({
			state: sql`CASE WHEN ${pollJobs.attempts} >= ${maximumPollAttempts} THEN 'failed' ELSE 'ready' END`,
			dueAt: new Date(now.getTime() + backoffMs + jitterMs),
			leaseToken: null,
			leaseExpiresAt: null,
			lastError: "processor_failed",
		})
		.where(ownedLease(lease, now))
		.returning({ id: pollJobs.id });
	if (rows.length !== 1) throw new LostPollLeaseError();
}

export async function runSyntheticPollCycle(db: WebmailDatabase, now?: Date) {
	const lease = await claimPoll(db, now);
	if (!lease) return false;
	// No network or AI adapter is registered; this processor is deliberately empty.
	await completePoll(db, lease, now);
	return true;
}
