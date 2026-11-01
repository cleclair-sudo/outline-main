import {
  EMAIL_DIGEST_END_MINUTES,
  EMAIL_DIGEST_START_MINUTES,
  EMAIL_DIGEST_STEP_MINUTES,
} from "@shared/constants";

export const EMAIL_DIGEST_TIME_ZONE = "America/New_York";
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
export const EMAIL_DIGEST_SETTLE_DELAY_MS = 10 * MINUTE_MS;
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

export function getNextEmailDigestAt(
  now: number,
  selectedTimes: readonly number[]
): number | undefined {
  if (!Number.isFinite(now)) {
    throw new RangeError("Digest schedule requires a finite time");
  }
  if (
    selectedTimes.some(
      (minutes) =>
        !Number.isInteger(minutes) ||
        minutes < EMAIL_DIGEST_START_MINUTES ||
        minutes > EMAIL_DIGEST_END_MINUTES ||
        minutes % EMAIL_DIGEST_STEP_MINUTES !== 0
    )
  ) {
    throw new RangeError("Digest times must be 30-minute Eastern time slots");
  }
  if (!selectedTimes.length) {
    return undefined;
  }

  const parts = easternDateFormatter.formatToParts(new Date(now));
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );
  const todayAtMidnight = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day)
  );
  const offsets = getEasternOffsets(now);
  let nextAt = Infinity;

  for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
    const dayStart = todayAtMidnight + dayOffset * DAY_MS;
    for (const minutes of selectedTimes) {
      const wallTime = dayStart + minutes * MINUTE_MS;
      const candidates = offsets
        .map((offset) => wallTime - offset)
        .filter((timestamp) => getEasternWallTime(timestamp) === wallTime)
        .sort((a, b) => a - b);
      const candidate = candidates[0];
      if (candidate !== undefined && candidate >= now) {
        nextAt = Math.min(nextAt, candidate);
      }
    }

    if (Number.isFinite(nextAt)) {
      return nextAt;
    }
  }

  throw new RangeError("Unable to find the next Eastern digest time");
}

export function getEmailDigestSchedule(
  now: number,
  selectedTimes: readonly number[]
): { slotAt: number; sendAt: number } | undefined {
  const slotAt = getNextEmailDigestAt(
    now - EMAIL_DIGEST_SETTLE_DELAY_MS,
    selectedTimes
  );
  if (slotAt === undefined) {
    return undefined;
  }

  return {
    slotAt,
    sendAt: slotAt + EMAIL_DIGEST_SETTLE_DELAY_MS,
  };
}

export function getEmailBufferingCron(): string {
  return "*/1 * * * *";
}
