import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export type PermissionResult = {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
};

function mapPermission(
  status: string,
  canAskAgain: boolean,
): PermissionResult {
  return {
    granted: status === 'granted',
    canAskAgain,
    status,
  };
}

export async function requestCameraPermission(): Promise<PermissionResult> {
  const current = await Camera.getCameraPermissionsAsync();
  if (current.granted) {
    return mapPermission(current.status, current.canAskAgain);
  }
  const next = await Camera.requestCameraPermissionsAsync();
  return mapPermission(next.status, next.canAskAgain);
}

export async function requestMediaLibraryPermission(): Promise<PermissionResult> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) {
    return mapPermission(current.status, current.canAskAgain);
  }
  const next = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return mapPermission(next.status, next.canAskAgain);
}

export async function requestLocationPermission(): Promise<PermissionResult> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) {
    return mapPermission(current.status, current.canAskAgain);
  }
  const next = await Location.requestForegroundPermissionsAsync();
  return mapPermission(next.status, next.canAskAgain);
}

export async function getCurrentPosition() {
  const permission = await requestLocationPermission();
  if (!permission.granted) {
    throw new Error('Location permission is required');
  }
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
}
