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
});