import { describe, expect, it } from "vitest";
import {
  getEmailBufferingCron,
  getEmailBufferingWindowMinutes,
} from "./emailBuffering";

describe("email buffering", () => {
  it("defaults to 20 minutes", () => {
    expect(getEmailBufferingWindowMinutes({})).toBe(20);
  });

  it("uses a 20 minute cron when the window is 20 minutes", () => {
    expect(getEmailBufferingCron(20)).toBe("*/20 * * * *");
  });

  it("supports legacy hourly overrides", () => {
    expect(getEmailBufferingWindowMinutes({ EMAIL_BUFFERING_WINDOW_HOURS: 3 })).toBe(
      180
    );
    expect(getEmailBufferingCron(180)).toBe("0 */3 * * *");
  });
});
