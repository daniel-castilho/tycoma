// Custom resolver so `npm test` (Node's built-in test runner) understands the
// `@/*` path alias declared in tsconfig.json and resolves TypeScript imports
// without explicit `.ts` extensions. Loaded via `--import`.
//
// Without this, files imported by tests that use `@/shared/...` or bare TS
// imports fail with `ERR_MODULE_NOT_FOUND`. The runner still uses Node's
// native --test and --experimental-strip-types — no extra npm dependencies.

import { pathToFileURL, fileURLToPath } from "node:url";
import { resolve as pathResolve, dirname } from "node:path";
import { existsSync, statSync } from "node:fs";

const ROOT = pathResolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = pathResolve(ROOT, "src");

function withExtensions(absPath) {
  if (existsSync(absPath)) {
    return statSync(absPath).isDirectory() ? pathResolve(absPath, "index.ts") : absPath;
  }
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = `${absPath}${ext}`;
    if (existsSync(candidate)) return candidate;
  }
  return absPath;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const abs = withExtensions(pathResolve(SRC, specifier.slice(2)));
    return nextResolve(pathToFileURL(abs).href, context);
  }

  // Resolve relative / absolute TS imports that omit the extension.
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !/\.[a-z]+$/i.test(specifier) &&
    context.parentURL
  ) {
    const parentPath = fileURLToPath(context.parentURL);
    const abs = withExtensions(pathResolve(dirname(parentPath), specifier));
    if (existsSync(abs)) {
      return nextResolve(pathToFileURL(abs).href, context);
    }
  }

  return nextResolve(specifier, context);
}
