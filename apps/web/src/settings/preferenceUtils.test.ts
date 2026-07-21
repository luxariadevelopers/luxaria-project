import { describe, expect, it } from 'vitest';
import {
  formStateToPreferencesPatch,
  preferencesToFormState,
} from './preferenceUtils';

describe('preferenceUtils', () => {
  it('maps API preferences to form defaults', () => {
    const form = preferencesToFormState(false, []);
    expect(form.muted).toBe(false);
    expect(form.events.approval_pending).toEqual({
      enabled: true,
      email: true,
      whatsapp: false,
    });
  });

  it('preserves push and in-app channels when saving', () => {
    const existing = [
      {
        eventType: 'approval_pending',
        enabled: true,
        channels: [
          { channel: 'in_app' as const, enabled: true },
          { channel: 'push' as const, enabled: false },
          { channel: 'email' as const, enabled: true },
        ],
      },
    ];
    const form = preferencesToFormState(false, existing);
    form.events.approval_pending = {
      enabled: true,
      email: false,
      whatsapp: true,
    };

    const patch = formStateToPreferencesPatch(form, existing);
    const row = patch.find((item) => item.eventType === 'approval_pending');

    expect(row?.channels).toEqual([
      { channel: 'in_app', enabled: true },
      { channel: 'push', enabled: false },
      { channel: 'email', enabled: false },
      { channel: 'whatsapp', enabled: true },
    ]);
  });
});
