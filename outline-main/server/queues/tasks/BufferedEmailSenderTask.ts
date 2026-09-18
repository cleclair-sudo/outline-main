import { BaseTask } from "./base/BaseTask";
import BufferedEmailStore from "@server/emails/BufferedEmailStore";
import emails from "@server/emails/templates";
import Logger from "@server/logging/Logger";

type Props = {};

export default class BufferedEmailSenderTask extends BaseTask<Props> {
  // Use default options from BaseTask

  public async perform() {
    const now = Date.now();
    const items = await BufferedEmailStore.fetchDue(now);

    if (!items.length) {
      return;
    }

    Logger.info("BufferedEmailSenderTask", `Sending ${items.length} buffered emails`);

    for (const item of items) {
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
