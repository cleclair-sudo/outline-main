import { randomUUID } from "node:crypto";
import RedisAdapter from "@server/storage/redis";
import Logger from "@server/logging/Logger";

const KEY = "buffered_emails";
const PROCESSING_KEY = "buffered_emails:processing";
const CLAIM_LIMIT = 100;
const CLAIM_LEASE_MS = 10 * 60 * 1000;

const claimDueScript = `
local expired = redis.call("ZRANGEBYSCORE", KEYS[2], "-inf", ARGV[1])
for _, item in ipairs(expired) do
  redis.call("ZREM", KEYS[2], item)
  redis.call("ZADD", KEYS[1], ARGV[1], item)
end

local items = redis.call(
  "ZRANGEBYSCORE",
  KEYS[1],
  "-inf",
  ARGV[1],
  "LIMIT",
  0,
  ARGV[3]
)
for _, item in ipairs(items) do
  if redis.call("ZREM", KEYS[1], item) == 1 then
    redis.call("ZADD", KEYS[2], ARGV[2], item)
  end
end
return items
`;

const rescheduleScript = `
for i = 1, #ARGV, 3 do
  redis.call("ZREM", KEYS[2], ARGV[i])
  redis.call("ZADD", KEYS[1], ARGV[i + 1], ARGV[i + 2])
end
return 1
`;

export interface BufferedEmailItem {
  id?: string;
  templateName: string;
  props: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  scheduledAt: number;
}

export default class BufferedEmailStore {
  static async add(item: BufferedEmailItem) {
    try {
      const client = RedisAdapter.defaultClient;
      const storedItem = { ...item, id: item.id ?? randomUUID() };
      await client.zadd(
        KEY,
        `${storedItem.scheduledAt}`,
        JSON.stringify(storedItem)
      );
    } catch (err) {
      Logger.error("Failed to buffer email", err);
      throw err;
    }
  }

  static async fetchDue(now = Date.now()): Promise<BufferedEmailItem[]> {
    const client = RedisAdapter.defaultClient;
    const items = (await client.eval(
      claimDueScript,
      2,
      KEY,
      PROCESSING_KEY,
      `${now}`,
      `${now + CLAIM_LEASE_MS}`,
      `${CLAIM_LIMIT}`
    )) as string[];
    if (!items.length) return [];

    return items.map((s) => JSON.parse(s) as BufferedEmailItem);
  }

<<<<<<< HEAD
  static async acknowledge(items: BufferedEmailItem[]) {
    if (!items.length) return;
    await RedisAdapter.defaultClient.zrem(
      PROCESSING_KEY,
      ...items.map((item) => JSON.stringify(item))
    );
  }

  static async extendLease(items: BufferedEmailItem[]) {
    if (!items.length) return;
    await RedisAdapter.defaultClient.zadd(
      PROCESSING_KEY,
      ...items.flatMap((item) => [
        `${Date.now() + CLAIM_LEASE_MS}`,
        JSON.stringify(item),
      ])
    );
  }

  static async reschedule(
    items: BufferedEmailItem[],
    scheduledAt: number
  ) {
    if (!items.length) return;

    const args = items.flatMap((item) => {
      const updatedItem = { ...item, scheduledAt };
      return [
        JSON.stringify(item),
        `${scheduledAt}`,
        JSON.stringify(updatedItem),
      ];
    });

    await RedisAdapter.defaultClient.eval(
      rescheduleScript,
      2,
      KEY,
      PROCESSING_KEY,
      ...args
    );
=======
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
>>>>>>> 428b1c34fce7b4219d45c295bb0b56bf2afcac40
  }

  static async count(): Promise<number> {
    const client = RedisAdapter.defaultClient;
    const [queued, processing] = await Promise.all([
      client.zcard(KEY),
      client.zcard(PROCESSING_KEY),
    ]);
    return queued + processing;
  }
}
