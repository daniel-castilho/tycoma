/**
 * Auth module constants. Centralised so policy lives in one place and tests
 * can pin the values without scattering magic numbers across use cases.
 */
export const MIN_PASSWORD_LENGTH = 8;

const ONE_MINUTE_SECONDS = 60;
const FIFTEEN_MINUTES_SECONDS = 15 * ONE_MINUTE_SECONDS;
const ONE_HOUR_SECONDS = 60 * ONE_MINUTE_SECONDS;
const ONE_HOUR_MS = ONE_HOUR_SECONDS * 1000;

export const LOGIN_RATE_LIMIT = {
  max: 8,
  windowSeconds: FIFTEEN_MINUTES_SECONDS,
} as const;

export const PASSWORD_RESET_RATE_LIMIT = {
  max: 5,
  windowSeconds: FIFTEEN_MINUTES_SECONDS,
} as const;

export const PASSWORD_RESET_TTL_MS = ONE_HOUR_MS;
export const PASSWORD_RESET_TOKEN_BYTES = 32;
