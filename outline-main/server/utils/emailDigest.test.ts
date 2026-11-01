import { describe, expect, it } from "vitest";
import type { BufferedEmailItem } from "@server/emails/BufferedEmailStore";
import { groupBufferedEmailItems } from "./emailDigest";

const item = (to: string, language = "en_US"): BufferedEmailItem => ({
  templateName: "DocumentMentionedEmail",
  props: { to, language },
  metadata: { notificationId: crypto.randomUUID() },
  scheduledAt: 0,
});

describe("email digest", () => {
  it("groups buffered notifications by recipient and language", () => {
    expect(
      groupBufferedEmailItems([
        item("USER@example.com"),
        item("user@example.com"),
        item("user@example.com", "de_DE"),
      ]).map((group) => group.length)
    ).toEqual([2, 1]);
  });

  it("keeps notifications from different digest intervals separate", () => {
    const sameIntervalEnd = Date.parse("2026-11-01T10:00:00Z");
    const nextIntervalEnd = Date.parse("2026-11-01T17:00:00Z");
    const sameIntervalItems = [
      {
        ...item("user@example.com"),
        scheduledAt: sameIntervalEnd + 10 * 60 * 1000,
        digestIntervalEndsAt: sameIntervalEnd,
      },
      {
        ...item("user@example.com"),
        scheduledAt: sameIntervalEnd + 10 * 60 * 1000,
        digestIntervalEndsAt: sameIntervalEnd,
      },
      {
        ...item("user@example.com"),
        scheduledAt: nextIntervalEnd + 10 * 60 * 1000,
        digestIntervalEndsAt: nextIntervalEnd,
      },
    ];

    expect(
      groupBufferedEmailItems(sameIntervalItems).map((group) => group.length)
    ).toEqual([2, 1]);
  });
});