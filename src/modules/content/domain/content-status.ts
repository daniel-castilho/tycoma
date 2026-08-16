import type { ContentStatus } from "./types";

const KNOWN_STATUSES: readonly ContentStatus[] = ["draft", "scheduled", "published"];

/**
 * Parses a `status` value coming from persistence into the domain enum.
 *
 * Throws on unknown values instead of silently degrading to `"draft"` —
 * persistence corruption or a schema drift must surface immediately rather
 * than be hidden behind a misleading default.
 */
export function parseContentStatus(value: string): ContentStatus {
  if ((KNOWN_STATUSES as readonly string[]).includes(value)) {
    return value as ContentStatus;
  }
  throw new Error(`Unknown content status in persistence: ${JSON.stringify(value)}`);
}
