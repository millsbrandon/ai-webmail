import { existsSync } from "node:fs";

if (existsSync(".env")) {
	process.loadEnvFile(".env");
}

await import(new URL("../node_modules/next/dist/bin/next", import.meta.url));
