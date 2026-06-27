#!/usr/bin/env bun
/**
 * CI guard: fails the build if a server function or `/api/` server route is
 * added without an explicit auth mechanism (`requireSupabaseAuth` middleware
 * or a documented exception).
 *
 * - Scans `src/lib/**\/*.functions.ts` and `src/routes/api/**\/*.{ts,tsx}`.
 * - Allowlists `src/routes/api/public/**` (these MUST verify callers
 *   themselves: webhook signatures, cron secrets, etc. — we still require an
 *   inline marker comment `// @public-endpoint: <reason>` to document why).
 * - A file may opt out with `// @auth-exempt: <reason>` on the first 30 lines.
 *
 * Usage: `bun scripts/check-auth-guard.ts`
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const TARGETS = ["src/lib", "src/routes/api"];
const PUBLIC_PREFIX = "src/routes/api/public";

type Violation = { file: string; reason: string };

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

function checkServerFn(src: string): string | null {
  if (!/createServerFn\s*\(/.test(src)) return null;
  if (/requireSupabaseAuth/.test(src)) return null;
  return "createServerFn without requireSupabaseAuth middleware";
}

function checkServerRoute(src: string, relPath: string): string | null {
  if (!/server:\s*\{[\s\S]*?handlers:/m.test(src)) return null;
  const isPublic = relPath.replace(/\\/g, "/").startsWith(PUBLIC_PREFIX);
  if (isPublic) {
    if (!/@public-endpoint:/.test(src)) {
      return "public API route missing `// @public-endpoint:` marker explaining the auth model";
    }
    return null;
  }
  if (/requireSupabaseAuth/.test(src)) return null;
  return "server route under /api/ without requireSupabaseAuth middleware (move to /api/public/ for external callers, or add auth)";
}

function exempt(src: string): boolean {
  const head = src.split("\n").slice(0, 30).join("\n");
  return /@auth-exempt:/.test(head);
}

const violations: Violation[] = [];
for (const t of TARGETS) {
  const files = walk(join(ROOT, t));
  for (const f of files) {
    const rel = relative(ROOT, f);
    const src = readFileSync(f, "utf8");
    if (exempt(src)) continue;
    const v = rel.startsWith("src/routes/api") ? checkServerRoute(src, rel) : checkServerFn(src);
    if (v) violations.push({ file: rel, reason: v });
  }
}

if (violations.length === 0) {
  console.log("✓ auth-guard: all server endpoints have an auth mechanism");
  process.exit(0);
}
console.error("\n✗ auth-guard: missing auth on server endpoints\n");
for (const v of violations) console.error(`  ${v.file}\n    -> ${v.reason}`);
console.error(
  `\n${violations.length} endpoint(s) need \`.middleware([requireSupabaseAuth])\`,` +
    ` an explicit \`// @public-endpoint:\` marker (for /api/public/*),` +
    ` or a \`// @auth-exempt: <reason>\` marker on the file header.\n`,
);
process.exit(1);