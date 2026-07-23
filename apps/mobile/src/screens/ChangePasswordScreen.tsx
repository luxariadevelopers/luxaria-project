import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { changePasswordRequest } from '@/api/auth';
import { getErrorMessage } from '@/auth/AuthContext';
import { Screen } from '@/components/Screen';
import type { AppStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'ChangePassword'>;

export function ChangePasswordScreen({ navigation }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (currentPassword.length < 8) {
      setError('Enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      setError('New password must be different from the current password');
      return;
    }

    setSubmitting(true);
    try {
      await changePasswordRequest({
        newPassword,
        currentPassword,
      });
      Alert.alert('Password updated', 'Your password has been changed.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not change password'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Change password" subtitle="Update your account password">
      <View style={styles.field}>
        <Text style={styles.label}>Current password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          textContentType="password"
          autoComplete="password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>New password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="password-new"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="At least 8 characters"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Confirm new password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="password-new"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, submitting && styles.disabled]}
        onPress={() => void handleSubmit()}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save password</Text>
        )}
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    color: colors.danger,
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.7,
  },
});
