/**
 * Known placeholder values that must never be used in production. These come
 * from old tutorials and the project's own `.env.example` — they are
 * convenient in dev but would silently turn HMAC keys into public knowledge.
 */
const FORBIDDEN_AUTH_SECRETS = [
  "change-me-to-a-long-random-string",
  "changeme",
  "secret",
  "dev-secret",
];

const MIN_AUTH_SECRET_LENGTH_DEV = 16;
const MIN_AUTH_SECRET_LENGTH_PROD = 32;

/**
 * Validates the `AUTH_SECRET` value under the same rules `parseEnv` applies:
 * present, no leading/trailing whitespace, no known placeholders (production
 * only), and a minimum length (16 non-production / 32 production). Throws on
 * violation and returns the validated secret. Pure module — safe to import
 * from the Edge runtime (no Prisma/Redis/`next/*`).
 */
export function validateAuthSecret(raw: string | undefined, opts: { isProduction: boolean }): string {
  if (!raw) {
    throw new Error("AUTH_SECRET must be set.");
  }
  const { isProduction } = opts;
  if (isProduction && raw.trim() !== raw) {
    throw new Error("AUTH_SECRET must not contain leading or trailing whitespace.");
  }
  if (isProduction && FORBIDDEN_AUTH_SECRETS.includes(raw)) {
    throw new Error(`AUTH_SECRET cannot be the placeholder "${raw}".`);
  }
  const minLength = isProduction ? MIN_AUTH_SECRET_LENGTH_PROD : MIN_AUTH_SECRET_LENGTH_DEV;
  if (raw.length < minLength) {
    throw new Error(
      `AUTH_SECRET must be at least ${minLength} characters ${isProduction ? "in production" : "in development"}.`,
    );
  }
  return raw;
}