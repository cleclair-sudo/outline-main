import * as React from "react";
import type { BufferedEmailItem } from "@server/emails/BufferedEmailStore";
import Logger from "@server/logging/Logger";
import { Notification } from "@server/models";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
import Body from "./components/Body";
import EmailTemplate from "./components/EmailLayout";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";
import emails from ".";

type InputProps = EmailProps & {
  items: BufferedEmailItem[];
};

type DigestContent = {
  component: JSX.Element;
  text: string;
  notification?: Notification;
};

type Props = InputProps & {
  contents: DigestContent[];
};

export default class DigestEmail extends BaseEmail<InputProps, { contents: DigestContent[] }> {
  protected get category() {
    return EmailMessageCategory.Notification;
  }

  protected async beforeSend({ items }: InputProps) {
    const contents: DigestContent[] = [];

    for (const item of items) {
      const EmailClass = (emails as any)[item.templateName];
      if (!EmailClass) {
        continue;
      }

      // @ts-expect-error instantiate concrete email class
      const email = new EmailClass(item.props, item.metadata);
      const content = await email.renderForDigest();
      if (content) {
        contents.push(content);
      }
    }

    if (!contents.length) {
      return false;
    }

    return { contents };
  }

  protected subject() {
    return this.t("Notifications");
  }

  protected preview({ contents }: Props) {
    return this.t("{{ count }} notifications", { count: contents.length });
  }

  protected renderAsText({ contents }: Props) {
    return contents.map((content) => content.text.trim()).join("\n\n---\n\n");
  }

  protected render({ contents }: Props) {
    return (
      <EmailTemplate previewText={this.preview({ contents } as Props)}>
        <Header />
        <Body>
          <Heading>{this.t("Notifications")}</Heading>
          {contents.map((content, index) => (
            <React.Fragment key={index}>
              {content.component}
              {index < contents.length - 1 ? <hr /> : null}
            </React.Fragment>
          ))}
        </Body>
        <Footer unsubscribeText={this.t("Unsubscribe from these emails")} />
      </EmailTemplate>
    );
  }

  protected async afterSend({ contents }: Props) {
    await Promise.all(
      contents.map(async ({ notification }) => {
        if (!notification) {
          return;
        }
        try {
          notification.emailedAt = new Date();
          await notification.save();
        } catch (err) {
          Logger.error("Failed to update notification", err, notification);
        }
      })
    );
  }
}