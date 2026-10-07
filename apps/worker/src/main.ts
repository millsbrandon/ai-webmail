function waitForShutdown() {
	return new Promise<void>((resolve) => {
		const keepAlive = setInterval(() => {}, 60_000);
		const shutdown = () => {
			clearInterval(keepAlive);
			process.off("SIGINT", shutdown);
			process.off("SIGTERM", shutdown);
			resolve();
		};

		process.once("SIGINT", shutdown);
		process.once("SIGTERM", shutdown);
	});
}

console.info(
	"AI Webmail worker started; no job processors are registered yet.",
);
await waitForShutdown();
console.info("AI Webmail worker stopped.");
