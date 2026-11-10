import { setTimeout } from "node:timers/promises";
import { createDatabase } from "@ai-webmail/db/client";
import { runSyntheticPollCycle } from "@ai-webmail/domain/poll-queue";

const connectionString = process.env.DATABASE_URL;
if (!connectionString)
	throw new Error("DATABASE_URL is required for the worker.");
const database = createDatabase(connectionString);
const shutdown = new AbortController();
const stop = () => shutdown.abort();
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

console.info("Worker started; only synthetic empty polls are supported.");
try {
	while (!shutdown.signal.aborted) {
		await runSyntheticPollCycle(database.db);
		try {
			await setTimeout(1000, undefined, { signal: shutdown.signal });
		} catch (error) {
			if (!(error instanceof Error && error.name === "AbortError")) throw error;
		}
	}
} catch (error) {
	console.error("Worker stopped after a queue failure.", error);
	process.exitCode = 1;
} finally {
	process.off("SIGINT", stop);
	process.off("SIGTERM", stop);
	await database.pool.end();
	console.info("Worker stopped.");
}
