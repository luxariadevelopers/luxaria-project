import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'luxaria.accessToken';
const REFRESH_TOKEN_KEY = 'luxaria.refreshToken';
const USER_KEY = 'luxaria.user';
const PROJECT_ID_KEY = 'luxaria.selectedProjectId';
const SITE_ID_KEY = 'luxaria.selectedSiteId';

/** SecureStore is native-only; web uses AsyncStorage (localStorage). */
const useSecureStore = Platform.OS !== 'web';

type MemoryCache = {
  accessToken: string | null;
  refreshToken: string | null;
  userJson: string | null;
  selectedProjectId: string | null;
  selectedSiteId: string | null;
  hydrated: boolean;
};

const memory: MemoryCache = {
  accessToken: null,
  refreshToken: null,
  userJson: null,
  selectedProjectId: null,
  selectedSiteId: null,
  hydrated: false,
};

async function getSecure(key: string): Promise<string | null> {
  if (!useSecureStore) {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setSecure(key: string, value: string | null) {
  if (!useSecureStore) {
    if (value == null) {
      await AsyncStorage.removeItem(key);
      return;
    }
    await AsyncStorage.setItem(key, value);
    return;
  }
  if (value == null) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export const tokenStorage = {
  async hydrate() {
    const [accessToken, refreshToken, userJson, selectedProjectId, selectedSiteId] =
      await Promise.all([
        getSecure(ACCESS_TOKEN_KEY),
        getSecure(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
        AsyncStorage.getItem(PROJECT_ID_KEY),
        AsyncStorage.getItem(SITE_ID_KEY),
      ]);
    memory.accessToken = accessToken;
    memory.refreshToken = refreshToken;
    memory.userJson = userJson;
    memory.selectedProjectId = selectedProjectId;
    memory.selectedSiteId = selectedSiteId;
    memory.hydrated = true;
  },

  isHydrated() {
    return memory.hydrated;
  },

  getAccessToken() {
    return memory.accessToken;
  },

  getRefreshToken() {
    return memory.refreshToken;
  },

  async setTokens(accessToken: string, refreshToken: string) {
    memory.accessToken = accessToken;
    memory.refreshToken = refreshToken;
    await Promise.all([
      setSecure(ACCESS_TOKEN_KEY, accessToken),
      setSecure(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  },

  getUser<T>() {
    if (!memory.userJson) return null;
    try {
      return JSON.parse(memory.userJson) as T;
    } catch {
      return null;
    }
  },

  async setUser(user: unknown) {
    const json = JSON.stringify(user);
    memory.userJson = json;
    await AsyncStorage.setItem(USER_KEY, json);
  },

  getSelectedProjectId() {
    return memory.selectedProjectId;
  },

  async setSelectedProjectId(projectId: string | null) {
    memory.selectedProjectId = projectId;
    if (projectId == null) {
      await AsyncStorage.removeItem(PROJECT_ID_KEY);
      return;
    }
    await AsyncStorage.setItem(PROJECT_ID_KEY, projectId);
  },

  getSelectedSiteId() {
    return memory.selectedSiteId;
  },

  async setSelectedSiteId(siteId: string | null) {
    memory.selectedSiteId = siteId;
    if (siteId == null) {
      await AsyncStorage.removeItem(SITE_ID_KEY);
      return;
    }
    await AsyncStorage.setItem(SITE_ID_KEY, siteId);
  },

  async clearAll() {
    memory.accessToken = null;
    memory.refreshToken = null;
    memory.userJson = null;
    memory.selectedProjectId = null;
    memory.selectedSiteId = null;
    await Promise.all([
      setSecure(ACCESS_TOKEN_KEY, null),
      setSecure(REFRESH_TOKEN_KEY, null),
      AsyncStorage.multiRemove([USER_KEY, PROJECT_ID_KEY, SITE_ID_KEY]),
    ]);
  },
};
