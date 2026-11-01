import { debounce } from "es-toolkit/compat";
import { runInAction } from "mobx";
import { observer } from "mobx-react";
import {
  AcademicCapIcon,
  CheckboxIcon,
  CollectionIcon,
  CommentIcon,
  DocumentIcon,
  DoneIcon,
  EditIcon,
  EmailIcon,
  PublishIcon,
  SmileyIcon,
  StarredIcon,
  UserIcon,
  GroupIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { NotificationEventType, UserPreference } from "@shared/types";
import Heading from "~/components/Heading";
import Notice from "~/components/Notice";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useCurrentUser from "~/hooks/useCurrentUser";
import { client } from "~/utils/ApiClient";
import isCloudHosted from "~/utils/isCloudHosted";
import SettingRow from "./components/SettingRow";

function Notifications() {
  const user = useCurrentUser();
  const { t } = useTranslation();
  const digestTimes =
    user.getPreference(UserPreference.BufferEmailNotificationsTimes) ?? [];

  const options = [
    {
      event: NotificationEventType.PublishDocument,
      icon: <PublishIcon />,
      title: t("Document published"),
      description: t(
        "Receive a notification whenever a new document is published"
      ),
    },
    {
      event: NotificationEventType.UpdateDocument,
      icon: <EditIcon />,
      title: t("Document updated"),
      description: t(
        "Receive a notification when a document you are subscribed to is edited"
      ),
    },
    {
      event: NotificationEventType.CreateComment,
      icon: <CommentIcon />,
      title: t("Comment posted"),
      description: t(
        "Receive a notification when a document you are subscribed to or a thread you participated in receives a comment"
      ),
    },
    {
      event: NotificationEventType.MentionedInComment,
      icon: <EmailIcon />,
      title: t("Mentioned"),
      description: t(
        "Receive a notification when someone mentions you in a document or comment"
      ),
    },
    {
      event: NotificationEventType.GroupMentionedInDocument,
      icon: <GroupIcon />,
      title: t("Group mentions"),
      description: t(
        "Receive a notification when someone mentions a group you are a member of in a document or comment"
      ),
    },
    {
      event: NotificationEventType.ResolveComment,
      icon: <DoneIcon />,
      title: t("Resolved"),
      description: t(
        "Receive a notification when a comment thread you were involved in is resolved"
      ),
    },
    {
      event: NotificationEventType.ReactionsCreate,
      icon: <SmileyIcon />,
      title: t("Reaction added"),
      description: t(
        "Receive a notification when someone reacts to your comment"
      ),
    },
    {
      event: NotificationEventType.CreateCollection,
      icon: <CollectionIcon />,
      title: t("Collection created"),
      description: t(
        "Receive a notification whenever a new collection is created"
      ),
    },
    {
      event: NotificationEventType.InviteAccepted,
      icon: <UserIcon />,
      title: t("Invite accepted"),
      description: t(
        "Receive a notification when someone you invited creates an account"
      ),
    },
    {
      event: NotificationEventType.AddUserToDocument,
      icon: <DocumentIcon />,
      title: t("Invited to document"),
      description: t(
        "Receive a notification when a document is shared with you"
      ),
    },
    {
      event: NotificationEventType.AddUserToCollection,
      icon: <CollectionIcon />,
      title: t("Invited to collection"),
      description: t(
        "Receive a notification when you are given access to a collection"
      ),
    },
    {
      event: NotificationEventType.ExportCompleted,
      icon: <CheckboxIcon checked />,
      title: t("Export completed"),
      description: t(
        "Receive a notification when an export you requested has been completed"
      ),
    },
    {
      event: NotificationEventType.RequestDocumentAccess,
      icon: <CheckboxIcon checked />,
      title: t("Document access requested"),
      description: t(
        "Receive a notification when a user requests access to a document you manage"
      ),
    },
    {
      visible: isCloudHosted,
      icon: <AcademicCapIcon />,
      event: NotificationEventType.Onboarding,
      title: t("Getting started"),
      description: t("Tips on getting started with features and functionality"),
    },
    {
      visible: isCloudHosted,
      icon: <StarredIcon />,
      event: NotificationEventType.Features,
      title: t("New features"),
      description: t("Receive an email when new features of note are added"),
    },
  ];

  const visibleOptions = options.filter((o) => o.visible !== false);

  const showSuccessMessage = debounce(() => {
    toast.success(t("Notifications saved"));
  }, 500);

  const handleChange = React.useCallback(
    (eventType: NotificationEventType) => async (checked: boolean) => {
      await user.setNotificationEventType(eventType, checked);
      showSuccessMessage();
    },
    [user, showSuccessMessage]
  );

  const handleEmailViewedNotificationsChange = React.useCallback(
    async (checked: boolean) => {
      user.setPreference(UserPreference.EmailViewedDocumentNotifications, checked);
      await user.save();
      showSuccessMessage();
    },
    [user, showSuccessMessage]
  );

  const handleBufferEmailNotificationsChange = React.useCallback(
    async (checked: boolean) => {
      if (
        checked &&
        !user.getPreference(UserPreference.BufferEmailNotificationsTimes)
          ?.length
      ) {
        toast.error(t("Choose at least one digest time before enabling digests."));
        return;
      }

      user.setPreference(UserPreference.BufferEmailNotifications, checked);
      await user.save();
      showSuccessMessage();
    },
    [user, showSuccessMessage, t]
  );

  const digestTimeOptions = React.useMemo(
    () =>
      Array.from({ length: 48 }, (_, index) => {
        const minutes = index * 30;
        const label = new Intl.DateTimeFormat(undefined, {
          timeZone: "UTC",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(Date.UTC(2020, 0, 1, 0, minutes)));
        return { minutes, label };
      }),
    []
  );

  const handleDigestTimeChange = React.useCallback(
    async (minutes: number, checked: boolean) => {
      const selectedTimes = new Set(
        user.getPreference(UserPreference.BufferEmailNotificationsTimes) ?? []
      );
      const hadSelectedTimes = selectedTimes.size > 0;
      if (checked) {
        selectedTimes.add(minutes);
      } else {
        selectedTimes.delete(minutes);
      }
      const selectedTimeValues = Array.from(selectedTimes).sort(
        (a, b) => a - b
      );
      user.setPreference(
        UserPreference.BufferEmailNotificationsTimes,
        selectedTimeValues
      );
      if (!hadSelectedTimes || !selectedTimeValues.length) {
        user.setPreference(UserPreference.BufferEmailNotifications, false);
      }
      await user.save();
      showSuccessMessage();
    },
    [user, showSuccessMessage]
  );

  const handleToggleAll = React.useCallback(
    async (checked: boolean) => {
      runInAction(() => {
        const updated = { ...user.notificationSettings };
        for (const option of visibleOptions) {
          updated[option.event] = checked;
        }
        user.notificationSettings = updated;
      });
      await client.post(
        checked
          ? `/users.notificationsSubscribe`
          : `/users.notificationsUnsubscribe`
      );
      showSuccessMessage();
    },
    [user, visibleOptions, showSuccessMessage]
  );

  const allEnabled = visibleOptions.every((o) =>
    user.subscribedToEventType(o.event)
  );

  const showSuccessNotice = window.location.search === "?success";

  return (
    <Scene title={t("Notifications")} icon={<EmailIcon />}>
      <Heading>{t("Notifications")}</Heading>

      {showSuccessNotice && (
        <Notice>
          <Trans>
            Unsubscription successful. Your notification settings were updated
          </Trans>
        </Notice>
      )}
      <Text as="p" type="secondary">
        <Trans>Manage when and where you receive email notifications.</Trans>
      </Text>

      <SettingRow
        name="allNotifications"
        label={t("All notifications")}
        compact
        border={false}
      >
        <Switch
          id="allNotifications"
          checked={allEnabled}
          onChange={handleToggleAll}
        />
      </SettingRow>

      <SettingRow
        name={UserPreference.EmailViewedDocumentNotifications}
        label={t("Email me about documents I've already viewed")}
        description={t(
          "Turn this off to skip notification emails when you have viewed the document since the update."
        )}
        compact
      >
        <Switch
          id={UserPreference.EmailViewedDocumentNotifications}
          name={UserPreference.EmailViewedDocumentNotifications}
          checked={!!user.getPreference(UserPreference.EmailViewedDocumentNotifications)}
          onChange={handleEmailViewedNotificationsChange}
        />
      </SettingRow>

      <Heading as="h2">{t("Email digest")}</Heading>
      <SettingRow
        name={UserPreference.BufferEmailNotificationsTimes}
        label={t("Digest delivery times")}
        description={t(
          "Choose any number of 30-minute send times in Eastern Time. With digests turned off, notification emails are sent right away."
        )}
      >
        <DigestTimesGrid>
          {digestTimeOptions.map(({ minutes, label }) => (
            <DigestTimeOption key={minutes}>
              <input
                type="checkbox"
                name={UserPreference.BufferEmailNotificationsTimes}
                value={minutes}
                checked={digestTimes.includes(minutes)}
                aria-label={label}
                onChange={(event) =>
                  handleDigestTimeChange(minutes, event.target.checked)
                }
              />
              {label}
            </DigestTimeOption>
          ))}
        </DigestTimesGrid>
      </SettingRow>
      <SettingRow
        name={UserPreference.BufferEmailNotifications}
        label={t("Enable email digest")}
        description={t(
          digestTimes.length
            ? "When enabled, notifications are grouped for the next selected time and sent about 10 minutes later to allow delayed jobs to arrive."
            : "Select at least one delivery time before enabling digests. Until then, notification emails are sent right away."
        )}
        compact
      >
        <Switch
          id={UserPreference.BufferEmailNotifications}
          name={UserPreference.BufferEmailNotifications}
          checked={
            !!user.getPreference(UserPreference.BufferEmailNotifications) &&
            digestTimes.length > 0
          }
          onChange={handleBufferEmailNotificationsChange}
        />
      </SettingRow>

      {options.map((option) => {
        const setting = user.subscribedToEventType(option.event);

        return (
          <SettingRow
            key={option.event}
            visible={option.visible}
            label={option.title}
            name={option.event}
            description={
              <Text size="small" type="secondary">
                {option.description}
              </Text>
            }
            compact
          >
            <Switch
              key={option.event}
              id={option.event}
              name={option.event}
              checked={!!setting}
              onChange={handleChange(option.event)}
            />
          </SettingRow>
        );
      })}
    </Scene>
  );
}

export default observer(Notifications);

const DigestTimesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  max-height: 300px;
  overflow-y: auto;

  @media (max-width: 768px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const DigestTimeOption = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
`;
