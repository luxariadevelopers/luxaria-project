/**
 * Simple {{variable}} interpolation for notification templates.
 */
export function renderTemplate(
  template: string,
  data: Record<string, unknown>,
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const value = data[key];
    if (value === undefined || value === null) {
      return '';
    }
    return String(value);
  });
}
