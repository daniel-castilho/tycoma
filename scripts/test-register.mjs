// Registers the path-alias resolver so `npm test` understands `@/*`.
// Loaded via `node --import ./scripts/test-register.mjs`.
import { register } from "node:module";

register("./test-resolver.mjs", import.meta.url);
