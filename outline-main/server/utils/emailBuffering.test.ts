import { describe, expect, it } from "vitest";
import {
  EMAIL_DIGEST_SETTLE_DELAY_MS,
  formatEmailDigestTime,
  getEmailBufferingCron,
  getEmailDigestSchedule,
  getNextEmailDigestAt,
} from "./emailBuffering";

describe("email buffering", () => {
  it("returns no schedule when no digest times are selected", () => {
    expect(getNextEmailDigestAt(Date.now(), [])).toBeUndefined();
    expect(getEmailDigestSchedule(Date.now(), [])).toBeUndefined();
  });

  it("checks buffered email every minute", () => {
    expect(getEmailBufferingCron()).toBe("*/1 * * * *");
  });

  it("chooses the next selected Eastern time slot", () => {
    const now = Date.parse("2024-01-15T12:30:00Z");
    expect(getNextEmailDigestAt(now, [480])).toBe(
      Date.parse("2024-01-15T13:00:00Z")
    );
  });

  it("includes a selected time when a notification is created exactly on it", () => {
    const now = Date.parse("2024-01-15T13:00:00Z");
    expect(getNextEmailDigestAt(now, [480])).toBe(now);
  });

  it("supports selecting multiple times per day", () => {
    const now = Date.parse("2024-01-15T14:31:00Z");
    expect(getNextEmailDigestAt(now, [810, 990, 1170])).toBe(
      Date.parse("2024-01-15T21:30:00Z")
    );
  });

  it("adds the settling delay after the selected time", () => {
    const now = Date.parse("2024-01-15T12:30:00Z");
    expect(getEmailDigestSchedule(now, [480])).toEqual({
      slotAt: Date.parse("2024-01-15T13:00:00Z"),
      sendAt:
        Date.parse("2024-01-15T13:00:00Z") +
        EMAIL_DIGEST_SETTLE_DELAY_MS,
    });
  });

  it("includes notifications created during the settling window", () => {
    const now = Date.parse("2024-01-15T13:05:00Z");
    expect(getEmailDigestSchedule(now, [480])).toEqual({
      slotAt: Date.parse("2024-01-15T13:00:00Z"),
      sendAt: Date.parse("2024-01-15T13:00:00Z") +
        EMAIL_DIGEST_SETTLE_DELAY_MS,
    });
  });

  it("skips a selected time that does not exist when daylight saving starts", () => {
    const now = Date.parse("2024-03-10T06:00:00Z");
    expect(getNextEmailDigestAt(now, [150])).toBe(
      Date.parse("2024-03-11T06:30:00Z")
    );
  });

  it("uses only the first occurrence of a selected time when daylight saving ends", () => {
    const beforeFirstOccurrence = Date.parse("2024-11-03T05:00:00Z");
    expect(getNextEmailDigestAt(beforeFirstOccurrence, [90])).toBe(
      Date.parse("2024-11-03T05:30:00Z")
    );

    const afterFirstOccurrence = Date.parse("2024-11-03T05:45:00Z");
    expect(getNextEmailDigestAt(afterFirstOccurrence, [90])).toBe(
      Date.parse("2024-11-04T06:30:00Z")
    );
  });

  it("formats scheduled email times in Eastern Time with the correct DST label", () => {
    expect(formatEmailDigestTime(Date.parse("2026-11-01T10:10:00Z"))).toContain(
      "EST"
    );
  });

  it("rejects invalid digest times", () => {
    expect(() => getNextEmailDigestAt(0, [60])).toThrow(RangeError);
    expect(() => getNextEmailDigestAt(0, [-30])).toThrow(RangeError);
    expect(() => getNextEmailDigestAt(0, [1440])).toThrow(RangeError);
  });
});
