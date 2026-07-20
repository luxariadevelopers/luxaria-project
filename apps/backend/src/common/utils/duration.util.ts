/** Parses Nest-style durations like 15m, 7d into milliseconds. */
export function parseDurationToMs(value: string, fallbackMs: number): number {
  const match = /^(\d+)([smhd])$/i.exec(value.trim());
  if (!match) {
    return fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60_000;
    case 'h':
      return amount * 3_600_000;
    case 'd':
      return amount * 86_400_000;
    default:
      return fallbackMs;
  }
}
