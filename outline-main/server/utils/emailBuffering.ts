export type EmailBufferingSettings = {
  EMAIL_BUFFERING_WINDOW_MINUTES?: number | string;
  EMAIL_BUFFERING_WINDOW_HOURS?: number | string;
  userBufferMinutes?: number;
};

export const EMAIL_DIGEST_TIME_ZONE = "America/New_York";
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
export const EMAIL_DIGEST_SETTLE_DELAY_MS = 10 * MINUTE_MS;
const MAX_EASTERN_OFFSET_CHANGE_MS = 2 * 60 * MINUTE_MS;
const EASTERN_OFFSET_LOOKAROUND_MS = 2 * DAY_MS;
const easternDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: EMAIL_DIGEST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const easternLogFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: EMAIL_DIGEST_TIME_ZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

export function formatEmailDigestTime(timestamp: number): string {
  return easternLogFormatter.format(new Date(timestamp));
}

function getEasternWallTime(timestamp: number): number {
  const parts = easternDateFormatter.formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );
  return Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute)
  );
}

function getEasternOffsets(now: number): number[] {
  const offsets = new Set<number>();
  for (const sample of [
    now - EASTERN_OFFSET_LOOKAROUND_MS,
    now,
    now + EASTERN_OFFSET_LOOKAROUND_MS,
  ]) {
    const sampleMinute = Math.floor(sample / MINUTE_MS) * MINUTE_MS;
    offsets.add(getEasternWallTime(sampleMinute) - sampleMinute);
  }

  return Array.from(offsets);
}

function findIntervalBoundary(
  now: number,
  intervalMs: number,
  direction: -1 | 1,
  offsets: number[]
): number {
  const maxSteps = Math.ceil(MAX_EASTERN_OFFSET_CHANGE_MS / intervalMs) + 2;
  const nowMinute = Math.floor(now / MINUTE_MS) * MINUTE_MS;
  let closestBoundary = direction === -1 ? -Infinity : Infinity;

  for (const offset of offsets) {
    const wallNow = nowMinute + offset;
    const wallStart = Math.floor(wallNow / intervalMs) * intervalMs;
    let wallBoundary =
      direction === -1 ? wallStart : wallStart + intervalMs;

    for (let step = 0; step < maxSteps; step++) {
      const timestamp = wallBoundary - offset;
      const isValidBoundary =
        getEasternWallTime(timestamp) === wallBoundary;
      const isInDirection =
        direction === -1 ? timestamp <= now : timestamp > now;

      if (isValidBoundary && isInDirection) {
        closestBoundary =
          direction === -1
            ? Math.max(closestBoundary, timestamp)
            : Math.min(closestBoundary, timestamp);
        break;
      }

      wallBoundary += direction * intervalMs;
    }
  }

  if (!Number.isFinite(closestBoundary)) {
    throw new RangeError("Unable to find an Eastern digest interval boundary");
  }
  return closestBoundary;
}

export function getEmailBufferingWindowMinutes(
  settings: EmailBufferingSettings = {}
): number {
  if (
    typeof settings.userBufferMinutes === "number" &&
    Number.isFinite(settings.userBufferMinutes) &&
    settings.userBufferMinutes > 0
  ) {
    return settings.userBufferMinutes;
  }

  const configuredMinutesValue =
    settings.EMAIL_BUFFERING_WINDOW_MINUTES !== undefined
      ? Number(settings.EMAIL_BUFFERING_WINDOW_MINUTES)
      : undefined;

  if (
    configuredMinutesValue !== undefined &&
    Number.isFinite(configuredMinutesValue) &&
    configuredMinutesValue > 0
  ) {
    return configuredMinutesValue;
  }

  const hoursValue =
    settings.EMAIL_BUFFERING_WINDOW_HOURS !== undefined
      ? Number(settings.EMAIL_BUFFERING_WINDOW_HOURS)
      : undefined;

  if (
    hoursValue !== undefined &&
    Number.isFinite(hoursValue) &&
    hoursValue > 0
  ) {
    return hoursValue * 60;
  }

  return 20;
}

export function getNextEmailDigestAt(
  now: number,
  windowMinutes: number
): number {
  return getEmailDigestInterval(now, windowMinutes).sendAt;
}

export function getEmailDigestInterval(
  now: number,
  windowMinutes: number
): { startAt: number; endAt: number; sendAt: number } {
  if (
    !Number.isFinite(now) ||
    !Number.isFinite(windowMinutes) ||
    windowMinutes <= 0
  ) {
    throw new RangeError("Digest interval requires a finite time and duration");
  }

  const windowMs = windowMinutes * 60 * 1000;
  const offsets = getEasternOffsets(now);
  const startAt = findIntervalBoundary(now, windowMs, -1, offsets);
  const endAt = findIntervalBoundary(now, windowMs, 1, offsets);
  return {
    startAt,
    endAt,
    sendAt: endAt + EMAIL_DIGEST_SETTLE_DELAY_MS,
  };
}

export function getEmailBufferingCron(windowMinutes: number): string {
  if (windowMinutes <= 0 || !Number.isFinite(windowMinutes)) {
    return "*/1 * * * *";
  }

  if (windowMinutes >= 60 && Number.isInteger(windowMinutes / 60)) {
    const hours = windowMinutes / 60;
    if (hours === 1) {
      return "0 * * * *";
    }
    return `0 */${hours} * * *`;
  }

  const minuteInterval = Math.min(59, Math.max(1, Math.round(windowMinutes)));
  return `*/${minuteInterval} * * * *`;
}
