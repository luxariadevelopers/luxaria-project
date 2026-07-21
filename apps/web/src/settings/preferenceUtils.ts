import { ALL_NOTIFICATION_EVENT_TYPES } from '@/notifications/eventTypes';
import type {
  EventPreferenceFormState,
  NotificationEventPreference,
  NotificationPreferencesFormState,
} from './types';

function channelEnabled(
  channels: NotificationEventPreference['channels'],
  channel: 'email' | 'whatsapp',
  defaultValue: boolean,
): boolean {
  const pref = channels?.find((row) => row.channel === channel);
  if (!pref) {
    return defaultValue;
  }
  return pref.enabled !== false;
}

export function preferencesToFormState(
  muted: boolean,
  events: NotificationEventPreference[] = [],
): NotificationPreferencesFormState {
  const eventState = ALL_NOTIFICATION_EVENT_TYPES.reduce<
    Record<string, EventPreferenceFormState>
  >((acc, eventType) => {
    const existing = events.find((row) => row.eventType === eventType);
    acc[eventType] = {
      enabled: existing ? existing.enabled !== false : true,
      email: channelEnabled(existing?.channels, 'email', true),
      whatsapp: channelEnabled(existing?.channels, 'whatsapp', false),
    };
    return acc;
  }, {});

  return { muted, events: eventState };
}

function mergeChannelPreferences(
  existing: NotificationEventPreference | undefined,
  email: boolean,
  whatsapp: boolean,
): NotificationEventPreference['channels'] {
  const preserved =
    existing?.channels?.filter(
      (row) => row.channel === 'in_app' || row.channel === 'push',
    ) ?? [];

  return [
    ...preserved,
    { channel: 'email', enabled: email },
    { channel: 'whatsapp', enabled: whatsapp },
  ];
}

export function formStateToPreferencesPatch(
  form: NotificationPreferencesFormState,
  existingEvents: NotificationEventPreference[] = [],
): NotificationEventPreference[] {
  return ALL_NOTIFICATION_EVENT_TYPES.map((eventType) => {
    const state = form.events[eventType];
    const existing = existingEvents.find((row) => row.eventType === eventType);
    return {
      eventType,
      enabled: state.enabled,
      channels: mergeChannelPreferences(existing, state.email, state.whatsapp),
    };
  });
}
