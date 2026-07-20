/**
 * Masks credentials in a MongoDB URI for safe logging.
 * mongodb+srv://user:secret@cluster/... → mongodb+srv://***:***@cluster/...
 */
export function maskMongoUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    if (parsed.username || parsed.password) {
      parsed.username = '***';
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return uri.replace(/\/\/([^:/@]+)(:[^@]*)?@/, '//***:***@');
  }
}
