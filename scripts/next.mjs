import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
process.chdir(repositoryRoot);

const environmentFile = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(environmentFile)) {
	process.loadEnvFile(environmentFile);
}

await import(new URL("../node_modules/next/dist/bin/next", import.meta.url));
