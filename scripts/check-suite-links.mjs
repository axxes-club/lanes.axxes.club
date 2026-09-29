/**
 * Every href in the suite registry has to lead somewhere.
 *
 * The registry accumulated Signal, Matrix and Ledger — three products that were
 * named, coloured and given a blurb, and then never built. No repository, no
 * DNS, no references anywhere else in the codebase. What they did have was a
 * tile in the product switcher that led to a dead host, so a visitor clicking
 * around the family hit three dead ends and learned nothing about the four apps
 * that do exist.
 *
 * This is a script rather than a unit test because the assertion is about the
 * network: a test that mocks fetch would only prove the list is shaped
 * correctly, which was never the problem.
 *
 *   node scripts/check-suite-links.mjs
 *
 * Exit code 1 on any dead link, so it can sit in CI or a pre-push hook.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SUITE = join(here, "..", "src", "lib", "axxes", "suite.ts");

const TIMEOUT_MS = 8000;

const source = await readFile(SUITE, "utf8");

// Only external hrefs: a product that lives in this app has a relative href and
// is checked by the router instead.
const hrefs = [...new Set([...source.matchAll(/href:\s*"(https:\/\/[^"]+)"/g)].map((m) => m[1]))].sort();

if (hrefs.length === 0) {
  console.error("No external links found in", SUITE, "— did the shape of the file change?");
  process.exit(1);
}

console.log(`Checking ${hrefs.length} external link(s) in the AXXES suite registry\n`);

const dead = [];

for (const href of hrefs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let status = "ERR";
  try {
    const res = await fetch(href, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "axxes-suite-link-check" },
    });
    status = String(res.status);
    if (res.status >= 400) dead.push({ href, status });
  } catch (err) {
    // A DNS failure is the common case for a product that was never deployed,
    // and it is exactly what this script exists to catch — so it counts as dead
    // rather than being waved through as "network flaked".
    dead.push({ href, status: `unreachable (${err.name})` });
  } finally {
    clearTimeout(timer);
  }
  const ok = !dead.some((d) => d.href === href);
  console.log(`  ${ok ? "ok  " : "DEAD"}  ${String(status).padEnd(20)} ${href}`);
}

console.log();

if (dead.length > 0) {
  console.error(`${dead.length} dead link(s) in the suite registry:`);
  for (const d of dead) console.error(`  - ${d.href} (${d.status})`);
  console.error(
    "\nEach of these was a tile in the product switcher. Either point it at the\n" +
      "real host, or remove the entry: a planned product with a name and a colour\n" +
      "is not a product."
  );
  process.exit(1);
}

console.log("All suite links resolve.");
