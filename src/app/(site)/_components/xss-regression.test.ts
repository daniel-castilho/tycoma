import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, it } from "node:test";

/**
 * Regression guard: the public site must never introduce
 * `dangerouslySetInnerHTML` for CMS body fields without an explicit
 * sanitization decision. The body fields are stored as plain text and
 * currently rendered inside `<pre>` / `<p>`; React auto-escapes them, so
 * no stored XSS vector exists today. If a future feature wants HTML, it
 * MUST go through a sanitizer library (approved human dependency) before
 * this assertion is removed.
 */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("public site XSS regression guard", () => {
  it("does not introduce dangerouslySetInnerHTML on the public site", () => {
    const root = resolve(process.cwd(), "src/app/(site)");
    const files = walk(root);
    const offenders: string[] = [];
    for (const file of files) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      const text = readFileSync(file, "utf8");
      if (text.includes("dangerouslySetInnerHTML")) {
        offenders.push(file);
      }
    }
    assert.deepEqual(offenders, []);
  });
});
