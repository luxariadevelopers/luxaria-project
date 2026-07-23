import { colors } from './colors';

export const typography = {
  display: {
    fontSize: 28,
    fontWeight: '600' as const,
    color: colors.text,
    lineHeight: 34,
  },
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.textMuted,
    lineHeight: 20,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.text,
    lineHeight: 22,
  },
  bodyStrong: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    lineHeight: 22,
  },
  meta: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: colors.textMuted,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 15,
    fontWeight: '700' as const,
    lineHeight: 20,
  },
  tab: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
  },
} as const;
