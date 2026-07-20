import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import {
  requestCameraPermission,
  requestMediaLibraryPermission,
} from './permissions';

export type LocalFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

function fileNameFromUri(uri: string, fallback: string) {
  const segment = uri.split('/').pop();
  return segment && segment.length > 0 ? segment : fallback;
}

export async function pickImageFromCamera(): Promise<LocalFile | null> {
  const permission = await requestCameraPermission();
  if (!permission.granted) {
    throw new Error('Camera permission is required');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName ?? fileNameFromUri(asset.uri, 'photo.jpg'),
    mimeType: asset.mimeType ?? 'image/jpeg',
    size: asset.fileSize,
  };
}

export async function pickImageFromLibrary(): Promise<LocalFile | null> {
  const permission = await requestMediaLibraryPermission();
  if (!permission.granted) {
    throw new Error('Photo library permission is required');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName ?? fileNameFromUri(asset.uri, 'image.jpg'),
    mimeType: asset.mimeType ?? 'image/jpeg',
    size: asset.fileSize,
  };
}

export async function pickDocument(): Promise<LocalFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? 'application/octet-stream',
    size: asset.size ?? undefined,
  };
}

/**
 * Upload a local file to a presigned URL (e.g. S3 PUT).
 */
export async function uploadToPresignedUrl(
  file: LocalFile,
  uploadUrl: string,
  method: 'PUT' | 'POST' = 'PUT',
): Promise<{ status: number }> {
  const result = await FileSystem.uploadAsync(uploadUrl, file.uri, {
    httpMethod: method,
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': file.mimeType,
    },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed with status ${result.status}`);
  }
  return { status: result.status };
}

/**
 * Build a React Native FormData part for multipart API uploads.
 */
export function toFormDataFile(
  file: LocalFile,
  fieldName = 'file',
): FormData {
  const form = new FormData();
  form.append(fieldName, {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);
  return form;
}
