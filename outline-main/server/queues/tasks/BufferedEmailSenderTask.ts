import { BaseTask } from "./base/BaseTask";
import BufferedEmailStore, {
  type BufferedEmailItem,
} from "@server/emails/BufferedEmailStore";
import emails from "@server/emails/templates";
import DigestEmail from "@server/emails/templates/DigestEmail";
import Logger from "@server/logging/Logger";
import { EMAIL_DIGEST_TIME_ZONE } from "@server/utils/emailBuffering";
import { groupBufferedEmailItems } from "@server/utils/emailDigest";

type Props = {};

const RETRY_DELAY_MS = 60 * 1000;

export default class BufferedEmailSenderTask extends BaseTask<Props> {
  // Use default options from BaseTask

  public async perform() {
    const now = Date.now();
    const items = await BufferedEmailStore.fetchDue(now);

    if (!items.length) {
      return;
    }

    const notificationItems = items.filter(
      (item) => item.metadata?.notificationId
    );
    const otherItems = items.filter(
      (item) => !item.metadata?.notificationId
    );
    const groups = groupBufferedEmailItems(notificationItems);

    Logger.info(
      "BufferedEmailSenderTask",
      `Sending ${groups.length} notification digests and ${otherItems.length} buffered emails`
    );

    for (const group of groups) {
      try {
        const first = group[0];
        if (
          !first ||
          typeof first.props.to !== "string" ||
          !first.props.to.trim()
        ) {
          Logger.error(
            "Discarding buffered email digest without a recipient address",
            group
          );
          await BufferedEmailStore.acknowledge(group);
          continue;
        }
        await BufferedEmailStore.extendLease(group);
        Logger.info(
          "BufferedEmailSenderTask",
          "Sending queued notification digest",
          {
            queuedEmailCount: group.length,
            digestIntervalMinutes: Array.from(
              new Set(
                group
                  .map((item) => item.digestIntervalMinutes)
                  .filter(
                    (minutes): minutes is number => minutes !== undefined
                  )
              )
            ),
            intervalTimeZone: EMAIL_DIGEST_TIME_ZONE,
            intervalEndsAt: Array.from(
              new Set(
                group.map((item) => new Date(item.scheduledAt).toISOString())
              )
            ),
          }
        );
        const email = new DigestEmail({
          to: first.props.to,
          language:
            typeof first.props.language === "string"
              ? first.props.language
              : undefined,
          items: group,
        });
        await email.send();
        await BufferedEmailStore.acknowledge(group);
      } catch (err) {
        Logger.error("Failed to send buffered email digest", err, group);
        await this.retry(group);
      }
    }

    for (const item of otherItems) {
      try {
        await BufferedEmailStore.extendLease([item]);
        Logger.info(
          "BufferedEmailSenderTask",
          "Sending queued buffered email",
          {
            templateName: item.templateName,
            digestIntervalMinutes: item.digestIntervalMinutes,
            intervalTimeZone: EMAIL_DIGEST_TIME_ZONE,
            intervalEndsAt: new Date(item.scheduledAt).toISOString(),
          }
        );
        const EmailClass = (emails as any)[item.templateName];
        if (!EmailClass) {
          Logger.error(`Buffered email template not found: ${item.templateName}`);
          await BufferedEmailStore.acknowledge([item]);
          continue;
        }

        // @ts-expect-error - instantiate concrete email class
        const email = new EmailClass(item.props, item.metadata);
        await email.send();
        await BufferedEmailStore.acknowledge([item]);
      } catch (err) {
        Logger.error("Failed to send buffered email", err, item);
        await this.retry([item]);
      }
    }
  }

  private async retry(items: BufferedEmailItem[]) {
    await BufferedEmailStore.reschedule(
      items,
      Date.now() + RETRY_DELAY_MS
    );
  }
}
