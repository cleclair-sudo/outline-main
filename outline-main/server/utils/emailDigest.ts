import type { BufferedEmailItem } from "@server/emails/BufferedEmailStore";

export function groupBufferedEmailItems(
  items: BufferedEmailItem[]
): BufferedEmailItem[][] {
  const groups = new Map<string, BufferedEmailItem[]>();

  for (const item of items) {
    const to = typeof item.props.to === "string" ? item.props.to : "";
    const language = typeof item.props.language === "string" ? item.props.language : "";
    const digestSlot =
      item.digestSlotAt ?? item.digestIntervalEndsAt ?? item.scheduledAt;
    const key = `${to.toLowerCase()}\0${language}\0${digestSlot}`;
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  return Array.from(groups.values());
}