import { env } from "@/shared/env-instance";

/**
 * RFC 9116 `security.txt`. The `Expires` field is computed dynamically on
 * each request — one year from `now` — so the file never goes stale without
 * a manual yearly commit.
 *
 * Refs:
 *   https://www.rfc-editor.org/rfc/rfc9116
 *   https://securitytxt.org/
 */
export function GET(): Response {
  const expires = new Date();
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);

  const body = [
    `# https://securitytxt.org/`,
    `Contact: mailto:${env.SECURITY_CONTACT}`,
    `Expires: ${expires.toISOString()}`,
    `Preferred-Languages: en`,
    `Canonical: ${env.APP_URL}/.well-known/security.txt`,
    ``,
  ].join("\n");

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
