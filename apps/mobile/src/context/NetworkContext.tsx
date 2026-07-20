import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as Network from 'expo-network';

type NetworkContextValue = {
  isOnline: boolean;
  isInternetReachable: boolean | null;
  networkType: Network.NetworkStateType | null;
};

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NetworkContextValue>({
    isOnline: true,
    isInternetReachable: null,
    networkType: null,
  });

  useEffect(() => {
    let mounted = true;

    const apply = (networkState: Network.NetworkState) => {
      if (!mounted) return;
      setState({
        isOnline: Boolean(networkState.isConnected),
        isInternetReachable: networkState.isInternetReachable ?? null,
        networkType: networkState.type ?? null,
      });
    };

    void Network.getNetworkStateAsync().then(apply);

    const subscription = Network.addNetworkStateListener(apply);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return ctx;
}
