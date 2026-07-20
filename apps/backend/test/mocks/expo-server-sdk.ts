class ExpoMock {
  static isExpoPushToken(token: string) {
    return token.startsWith('ExponentPushToken[');
  }

  static isExpoPushReceiptId(id: string) {
    return id.startsWith('receipt-');
  }

  chunkPushNotifications<T>(messages: T[]) {
    return [messages];
  }

  async sendPushNotificationsAsync(messages: Array<{ to: string }>) {
    return messages.map((message, index) => ({
      status: 'ok' as const,
      id: `ticket-${index}:${message.to}`,
    }));
  }

  async getPushNotificationReceiptsAsync() {
    return {};
  }
}

export default ExpoMock;
export type ExpoPushMessage = Record<string, unknown>;
export type ExpoPushReceipt = Record<string, unknown>;
export type ExpoPushTicket = Record<string, unknown>;
