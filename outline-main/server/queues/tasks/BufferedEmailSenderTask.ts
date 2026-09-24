import { BaseTask } from "./base/BaseTask";
import BufferedEmailStore from "@server/emails/BufferedEmailStore";
import emails from "@server/emails/templates";
import DigestEmail from "@server/emails/templates/DigestEmail";
import Logger from "@server/logging/Logger";
import { groupBufferedEmailItems } from "@server/utils/emailDigest";

type Props = {};

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
        if (!first || typeof first.props.to !== "string") {
          continue;
        }
        const email = new DigestEmail({
          to: first.props.to,
          language:
            typeof first.props.language === "string"
              ? first.props.language
              : undefined,
          items: group,
        });
        await email.send();
      } catch (err) {
        Logger.error("Failed to send buffered email digest", err, group);
      }
    }

    for (const item of otherItems) {
      try {
        const EmailClass = (emails as any)[item.templateName];
        if (!EmailClass) {
          Logger.error(`Buffered email template not found: ${item.templateName}`);
          continue;
        }

        // @ts-expect-error - instantiate concrete email class
        const email = new EmailClass(item.props, item.metadata);
        await email.send();
      } catch (err) {
        Logger.error("Failed to send buffered email", err, item);
      }
    }
  }
}
