const TOKEN_DURATION_PATTERN = /^([1-9]\d*)([dwyhm])$/;

const TOKEN_DURATION_UNIT_MS = {
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
  y: 365 * 24 * 60 * 60 * 1000,
} as const;

type TokenDurationUnit = keyof typeof TOKEN_DURATION_UNIT_MS;

function isTokenDurationUnit(value: string): value is TokenDurationUnit {
  return Object.hasOwn(TOKEN_DURATION_UNIT_MS, value);
}

export function parseTokenDurationMs(duration: string): number {
  const match = TOKEN_DURATION_PATTERN.exec(duration);
  if (match === null) {
    throw new Error(
      `Invalid duration format: ${duration}. Expected a positive duration like 30d, 7w, 24h, or 1y.`,
    );
  }

  const amountText = match[1];
  const unitText = match[2];
  if (
    amountText === undefined ||
    unitText === undefined ||
    !isTokenDurationUnit(unitText)
  ) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const amount = Number(amountText);
  const durationMs = amount * TOKEN_DURATION_UNIT_MS[unitText];
  if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(durationMs)) {
    throw new Error(`Duration is too large: ${duration}`);
  }

  return durationMs;
}

export function getTokenExpiryTimestamp(duration: string, now: Date): string {
  if (Number.isNaN(now.getTime())) {
    throw new Error("Current time is outside the supported date range");
  }

  const expiresAt = new Date(now.getTime() + parseTokenDurationMs(duration));
  if (Number.isNaN(expiresAt.getTime())) {
    throw new Error(
      `Duration is outside the supported date range: ${duration}`,
    );
  }
  return expiresAt.toISOString();
}
