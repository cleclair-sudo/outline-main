import RedisAdapter from "@server/storage/redis";
import Logger from "@server/logging/Logger";

const KEY = "buffered_emails";

export interface BufferedEmailItem {
  templateName: string;
  props: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  scheduledAt: number;
}

export default class BufferedEmailStore {
  static async add(item: BufferedEmailItem) {
    try {
      const client = RedisAdapter.defaultClient;
      // Use a sorted set so we can query by scheduled timestamp
      await client.zadd(KEY, `${item.scheduledAt}`, JSON.stringify(item));
    } catch (err) {
      Logger.error("Failed to buffer email", err);
      throw err;
    }
  }

  static async fetchDue(now = Date.now()): Promise<BufferedEmailItem[]> {
    const client = RedisAdapter.defaultClient;
    const items = await client.zrangebyscore(KEY, "-inf", `${now}`);
    if (!items.length) return [];

    // remove the items we just fetched
    await client.zremrangebyscore(KEY, "-inf", `${now}`);

    return items.map((s) => JSON.parse(s) as BufferedEmailItem);
  }

  static async makeDueForRecipient(email: string): Promise<number> {
    const client = RedisAdapter.defaultClient;
    const items = await client.zrangebyscore(KEY, "-inf", "+inf");
    const recipient = email.toLowerCase();
    const matchingItems = items.filter((serialized) => {
      const item = JSON.parse(serialized) as BufferedEmailItem;
      return (
        typeof item.props.to === "string" &&
        item.props.to.toLowerCase() === recipient
      );
    });

    if (!matchingItems.length) {
      return 0;
    }

    const now = Date.now();
    await client.zadd(
      KEY,
      ...matchingItems.flatMap((item) => [now, item])
    );
    return matchingItems.length;
  }

  static async count(): Promise<number> {
    const client = RedisAdapter.defaultClient;
    return client.zcard(KEY);
  }
}
