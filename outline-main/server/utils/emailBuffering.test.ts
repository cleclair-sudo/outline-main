import { describe, expect, it } from "vitest";
import {
  EMAIL_DIGEST_SETTLE_DELAY_MS,
  formatEmailDigestTime,
  getEmailBufferingCron,
  getEmailBufferingWindowMinutes,
  getEmailDigestInterval,
  getNextEmailDigestAt,
} from "./emailBuffering";

describe("email buffering", () => {
  it("defaults to 20 minutes", () => {
    expect(getEmailBufferingWindowMinutes({})).toBe(20);
  });

  it("uses a 20 minute cron when the window is 20 minutes", () => {
    expect(getEmailBufferingCron(20)).toBe("*/20 * * * *");
  });

  it("supports checking for due emails every minute", () => {
    expect(getEmailBufferingCron(1)).toBe("*/1 * * * *");
  });

  it("supports legacy hourly overrides", () => {
    expect(
      getEmailBufferingWindowMinutes({ EMAIL_BUFFERING_WINDOW_HOURS: 3 })
    ).toBe(180);
    expect(getEmailBufferingCron(180)).toBe("0 */3 * * *");
  });

  it("prefers configured minutes over the legacy hourly value", () => {
    expect(
      getEmailBufferingWindowMinutes({
        EMAIL_BUFFERING_WINDOW_MINUTES: 45,
        EMAIL_BUFFERING_WINDOW_HOURS: 3,
      })
    ).toBe(45);
  });

  it("accepts 48-hour user intervals", () => {
    expect(getEmailBufferingWindowMinutes({ userBufferMinutes: 2880 })).toBe(
      2880
    );
  });

  it("schedules intervals on Eastern local clock boundaries", () => {
    const now = Date.parse("2024-01-15T12:30:00Z");
    expect(getEmailDigestInterval(now, 60)).toEqual({
      startAt: Date.parse("2024-01-15T12:00:00Z"),
      endAt: Date.parse("2024-01-15T13:00:00Z"),
      sendAt: Date.parse("2024-01-15T13:00:00Z") +
        EMAIL_DIGEST_SETTLE_DELAY_MS,
    });
    expect(getNextEmailDigestAt(now, 60)).toBe(
      Date.parse("2024-01-15T13:00:00Z") +
        EMAIL_DIGEST_SETTLE_DELAY_MS
    );
  });

  it("formats scheduled email times in Eastern Time with the correct DST label", () => {
    expect(
      formatEmailDigestTime(Date.parse("2026-11-01T10:10:00Z"))
    ).toContain("EST");
  });

  it("supports 48-hour Eastern intervals", () => {
    const now = Date.parse("2024-01-15T12:30:00Z");
    expect(getEmailDigestInterval(now, 48 * 60)).toEqual({
      startAt: Date.parse("2024-01-14T05:00:00Z"),
      endAt: Date.parse("2024-01-16T05:00:00Z"),
      sendAt:
        Date.parse("2024-01-16T05:00:00Z") +
        EMAIL_DIGEST_SETTLE_DELAY_MS,
    });
  });

  it("keeps notifications created before the same 7-hour boundary together", () => {
    const firstUpdate = Date.parse("2026-11-01T02:36:00Z");
    const lastUpdate = Date.parse("2026-11-01T02:42:00Z");
    const firstInterval = getEmailDigestInterval(firstUpdate, 7 * 60);
    const lastInterval = getEmailDigestInterval(lastUpdate, 7 * 60);

    expect(firstInterval).toEqual(lastInterval);
    expect(firstInterval).toEqual({
      startAt: Date.parse("2026-11-01T02:00:00Z"),
      endAt: Date.parse("2026-11-01T10:00:00Z"),
      sendAt:
        Date.parse("2026-11-01T10:00:00Z") +
        EMAIL_DIGEST_SETTLE_DELAY_MS,
    });
  });

  it("skips nonexistent Eastern boundaries when daylight saving time starts", () => {
    const now = Date.parse("2024-03-10T06:45:00Z");
    expect(getEmailDigestInterval(now, 60)).toEqual({
      startAt: Date.parse("2024-03-10T06:00:00Z"),
      endAt: Date.parse("2024-03-10T07:00:00Z"),
      sendAt: Date.parse("2024-03-10T07:00:00Z") +
        EMAIL_DIGEST_SETTLE_DELAY_MS,
    });

    const shortIntervalNow = Date.parse("2024-03-10T06:58:00Z");
    expect(getEmailDigestInterval(shortIntervalNow, 5)).toEqual({
      startAt: Date.parse("2024-03-10T06:55:00Z"),
      endAt: Date.parse("2024-03-10T07:00:00Z"),
      sendAt: Date.parse("2024-03-10T07:00:00Z") +
        EMAIL_DIGEST_SETTLE_DELAY_MS,
    });
  });

  it("handles repeated Eastern boundaries when daylight saving time ends", () => {
    const firstOccurrence = Date.parse("2024-11-03T05:30:00Z");
    expect(getEmailDigestInterval(firstOccurrence, 60)).toEqual({
      startAt: Date.parse("2024-11-03T05:00:00Z"),
      endAt: Date.parse("2024-11-03T06:00:00Z"),
      sendAt: Date.parse("2024-11-03T06:00:00Z") +
        EMAIL_DIGEST_SETTLE_DELAY_MS,
    });

    const now = Date.parse("2024-11-03T06:30:00Z");
    expect(getEmailDigestInterval(now, 60)).toEqual({
      startAt: Date.parse("2024-11-03T06:00:00Z"),
      endAt: Date.parse("2024-11-03T07:00:00Z"),
      sendAt: Date.parse("2024-11-03T07:00:00Z") +
        EMAIL_DIGEST_SETTLE_DELAY_MS,
    });
  });

  it("keeps short intervals aligned through the repeated Eastern hour", () => {
    const firstOccurrence = Date.parse("2024-11-03T05:56:00Z");
    expect(getEmailDigestInterval(firstOccurrence, 5)).toEqual({
      startAt: Date.parse("2024-11-03T05:55:00Z"),
      endAt: Date.parse("2024-11-03T06:00:00Z"),
      sendAt: Date.parse("2024-11-03T06:00:00Z") +
        EMAIL_DIGEST_SETTLE_DELAY_MS,
    });

    const secondOccurrence = Date.parse("2024-11-03T06:01:00Z");
    expect(getEmailDigestInterval(secondOccurrence, 5)).toEqual({
      startAt: Date.parse("2024-11-03T06:00:00Z"),
      endAt: Date.parse("2024-11-03T06:05:00Z"),
      sendAt: Date.parse("2024-11-03T06:05:00Z") +
        EMAIL_DIGEST_SETTLE_DELAY_MS,
    });
  });

  it("rejects invalid digest intervals", () => {
    expect(() => getNextEmailDigestAt(0, 0)).toThrow(RangeError);
  });
});
