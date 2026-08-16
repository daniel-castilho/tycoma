import { parseEnv } from "./env.ts";

/**
 * Validated environment singleton. Loaded once at module scope so adapters
 * that previously did `import { env } from "@/shared/env"` keep working.
 * Tests should import `parseEnv` from `./env.ts` directly to avoid mutating
 * `process.env`.
 */
export const env = parseEnv(process.env);
export { parseEnv } from "./env.ts";
