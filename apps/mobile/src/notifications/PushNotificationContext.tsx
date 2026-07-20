import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/auth/AuthContext';
import { appNavigationRef } from '@/navigation/navigationRef';
import {
  configureForegroundNotificationHandler,
  extractNotificationData,
  getLastNotificationResponse,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from './pushNotifications';
import {
  navigateFromNotificationData,
  resolveNotificationRoute,
} from './notificationNavigation';
import {
  syncPushRegistrationWithBackend,
  unregisterPushFromBackend,
} from './pushLifecycle';

type PushNotificationContextValue = {
  lastForegroundTitle: string | null;
  syncPushRegistration: () => Promise<{ registered: boolean; message: string }>;
};

const PushNotificationContext =
  createContext<PushNotificationContextValue | null>(null);

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [lastForegroundTitle, setLastForegroundTitle] = useState<string | null>(
    null,
  );
  const registeredRef = useRef(false);

  useEffect(() => {
    configureForegroundNotificationHandler();
  }, []);

  const syncPushRegistration = useCallback(async () => {
    return syncPushRegistrationWithBackend();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      registeredRef.current = false;
      return;
    }

    let cancelled = false;
    void (async () => {
      const result = await syncPushRegistrationWithBackend();
      if (!cancelled && result.registered) {
        registeredRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const receivedSub = addNotificationReceivedListener((notification) => {
      setLastForegroundTitle(notification.request.content.title ?? null);
    });

    const responseSub = addNotificationResponseListener((response) => {
      const data = extractNotificationData(response.notification);
      navigateFromNotificationData(appNavigationRef, data);
    });

    void getLastNotificationResponse().then((response) => {
      if (!response) {
        return;
      }
      const data = extractNotificationData(response.notification);
      navigateFromNotificationData(appNavigationRef, data);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  const value = useMemo<PushNotificationContextValue>(
    () => ({
      lastForegroundTitle,
      syncPushRegistration,
    }),
    [lastForegroundTitle, syncPushRegistration],
  );

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotifications() {
  const ctx = useContext(PushNotificationContext);
  if (!ctx) {
    throw new Error(
      'usePushNotifications must be used within PushNotificationProvider',
    );
  }
  return ctx;
}

export async function logoutPushCleanup() {
  await unregisterPushFromBackend();
}

export { resolveNotificationRoute };