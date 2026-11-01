import { describe, expect, it } from "vitest";
import {
  EMAIL_DIGEST_END_MINUTES,
  EMAIL_DIGEST_START_MINUTES,
} from "@shared/constants";
import {
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
    expect(getNextEmailDigestAt(now, [540])).toBe(
      Date.parse("2024-01-15T14:00:00Z")
    );
  });

  it("includes a selected time when a notification is created exactly on it", () => {
    const now = Date.parse("2024-01-15T14:00:00Z");
    expect(getNextEmailDigestAt(now, [540])).toBe(now);
  });

  it("supports selecting multiple times per day", () => {
    const now = Date.parse("2024-01-15T14:31:00Z");
    expect(getNextEmailDigestAt(now, [810, 990, 1170])).toBe(
      Date.parse("2024-01-15T18:30:00Z")
    );
  });

  it("schedules delivery for the selected time", () => {
    const now = Date.parse("2024-01-15T12:30:00Z");
    expect(getEmailDigestSchedule(now, [540])).toEqual({
      slotAt: Date.parse("2024-01-15T14:00:00Z"),
      sendAt: Date.parse("2024-01-15T14:00:00Z"),
    });
  });

  it("assigns notifications created after a slot to the next selected time", () => {
    const now = Date.parse("2024-01-15T14:05:00Z");
    expect(getEmailDigestSchedule(now, [540])).toEqual({
      slotAt: Date.parse("2024-01-16T14:00:00Z"),
      sendAt: Date.parse("2024-01-16T14:00:00Z"),
    });
  });

  it("keeps the selected morning time aligned when daylight saving starts", () => {
    const now = Date.parse("2024-03-10T12:00:00Z");
    expect(getNextEmailDigestAt(now, [540])).toBe(
      Date.parse("2024-03-10T13:00:00Z")
    );
  });

  it("keeps the selected morning time aligned when daylight saving ends", () => {
    const beforeSelectedTime = Date.parse("2024-11-03T12:00:00Z");
    expect(getNextEmailDigestAt(beforeSelectedTime, [540])).toBe(
      Date.parse("2024-11-03T14:00:00Z")
    );

    const afterSelectedTime = Date.parse("2024-11-03T14:01:00Z");
    expect(getNextEmailDigestAt(afterSelectedTime, [540])).toBe(
      Date.parse("2024-11-04T14:00:00Z")
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
    expect(() =>
      getNextEmailDigestAt(0, [EMAIL_DIGEST_START_MINUTES - 30])
    ).toThrow(RangeError);
    expect(() =>
      getNextEmailDigestAt(0, [EMAIL_DIGEST_END_MINUTES + 30])
    ).toThrow(RangeError);
  });

  it("allows the 9 AM and 8 PM endpoints", () => {
    const now = Date.parse("2024-01-15T12:00:00Z");
    expect(getNextEmailDigestAt(now, [EMAIL_DIGEST_START_MINUTES])).toBe(
      Date.parse("2024-01-15T14:00:00Z")
    );
    expect(getNextEmailDigestAt(now, [EMAIL_DIGEST_END_MINUTES])).toBe(
      Date.parse("2024-01-16T01:00:00Z")
    );
  });
});
