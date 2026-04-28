// Copies the built dashboard from artifacts/dashboard/dist into
// artifacts/api-server/public so api-server can serve the SPA in production.
// Run as part of `pnpm --filter @warmly/api-server run build`.

import { rmSync, cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "..", "dashboard", "dist");
const dest = resolve(here, "public");

if (!existsSync(src)) {
  console.error(`Dashboard build output missing at ${src}.`);
  console.error(
    "Run `pnpm --filter @warmly/dashboard run build` first, or use api-server's build script which chains both.",
  );
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`Copied dashboard build → ${dest}`);
