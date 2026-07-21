export type NotificationChannelPreference = {
  channel: 'in_app' | 'push' | 'email' | 'whatsapp';
  enabled: boolean;
};

export type NotificationEventPreference = {
  eventType: string;
  enabled: boolean;
  channels?: NotificationChannelPreference[];
};

export type NotificationPreferences = {
  userId: string;
  muted: boolean;
  events: NotificationEventPreference[];
};

export type EventPreferenceFormState = {
  enabled: boolean;
  email: boolean;
  whatsapp: boolean;
};

export type NotificationPreferencesFormState = {
  muted: boolean;
  events: Record<string, EventPreferenceFormState>;
};
