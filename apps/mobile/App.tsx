import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/auth/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NetworkProvider } from '@/context/NetworkContext';
import { ProjectProvider } from '@/context/ProjectContext';
import { PushNotificationProvider } from '@/notifications/PushNotificationContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { OfflineSyncProvider } from '@/offline';

export default function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <NetworkProvider>
              <AuthProvider>
                <ProjectProvider>
                  <OfflineSyncProvider>
                    <PushNotificationProvider>
                      <RootNavigator />
                    </PushNotificationProvider>
                    <StatusBar style="light" />
                  </OfflineSyncProvider>
                </ProjectProvider>
              </AuthProvider>
            </NetworkProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
