import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  pickImageFromCamera,
  pickImageFromLibrary,
  type LocalFile,
} from '@/utils/fileUpload';
import { colors } from '@/theme/colors';

type Props = {
  label: string;
  required?: boolean;
  file: LocalFile | null;
  attachedDocumentId?: string | null;
  disabled?: boolean;
  onCaptured: (file: LocalFile | null) => void;
};

export function SignatureCaptureField({
  label,
  required,
  file,
  attachedDocumentId,
  disabled,
  onCaptured,
}: Props) {
  const status = attachedDocumentId
    ? 'Attached'
    : file
      ? `Ready · ${file.name}`
      : required
        ? 'Required'
        : 'Optional';

  function pick() {
    if (disabled) return;
    Alert.alert(label, 'Capture signature / photo image', [
      {
        text: 'Camera',
        onPress: () => {
          void (async () => {
            try {
              const next = await pickImageFromCamera();
              if (next) onCaptured(next);
            } catch (error) {
              Alert.alert(
                label,
                error instanceof Error ? error.message : 'Capture failed',
              );
            }
          })();
        },
      },
      {
        text: 'Library',
        onPress: () => {
          void (async () => {
            try {
              const next = await pickImageFromLibrary();
              if (next) onCaptured(next);
            } catch (error) {
              Alert.alert(
                label,
                error instanceof Error ? error.message : 'Pick failed',
              );
            }
          })();
        },
      },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => onCaptured(null),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <Pressable
        style={[styles.button, disabled && styles.disabled]}
        disabled={disabled}
        onPress={pick}
      >
        <Text style={styles.buttonText}>{status}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  button: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  buttonText: { color: colors.text, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
