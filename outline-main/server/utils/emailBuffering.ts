export type EmailBufferingSettings = {
  EMAIL_BUFFERING_WINDOW_MINUTES?: number | string;
  EMAIL_BUFFERING_WINDOW_HOURS?: number | string;
  userBufferMinutes?: number;
};

export function getEmailBufferingWindowMinutes(
  settings: EmailBufferingSettings = {}
): number {
  if (
    typeof settings.userBufferMinutes === "number" &&
    Number.isFinite(settings.userBufferMinutes) &&
    settings.userBufferMinutes > 0
  ) {
    return settings.userBufferMinutes;
  }

  const configuredMinutesValue =
    settings.EMAIL_BUFFERING_WINDOW_MINUTES !== undefined
      ? Number(settings.EMAIL_BUFFERING_WINDOW_MINUTES)
      : undefined;

  if (
    configuredMinutesValue !== undefined &&
    Number.isFinite(configuredMinutesValue) &&
    configuredMinutesValue > 0
  ) {
    return configuredMinutesValue;
  }

  const hoursValue =
    settings.EMAIL_BUFFERING_WINDOW_HOURS !== undefined
      ? Number(settings.EMAIL_BUFFERING_WINDOW_HOURS)
      : undefined;

  if (
    hoursValue !== undefined &&
    Number.isFinite(hoursValue) &&
    hoursValue > 0
  ) {
    return hoursValue * 60;
  }

  return 20;
}

export function getEmailBufferingCron(windowMinutes: number): string {
  if (windowMinutes <= 0 || !Number.isFinite(windowMinutes)) {
    return "*/1 * * * *";
  }

  if (windowMinutes >= 60 && Number.isInteger(windowMinutes / 60)) {
    const hours = windowMinutes / 60;
    if (hours === 1) {
      return "0 * * * *";
    }
    return `0 */${hours} * * *`;
  }

  const minuteInterval = Math.min(59, Math.max(1, Math.round(windowMinutes)));
  return `*/${minuteInterval} * * * *`;
}
