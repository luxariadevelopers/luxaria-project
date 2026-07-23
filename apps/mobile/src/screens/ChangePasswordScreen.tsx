import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { changePasswordRequest } from '@/api/auth';
import { getErrorMessage } from '@/auth/AuthContext';
import { Button } from '@/components/Button';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import type { AppStackParamList } from '@/navigation/types';
import { colors, spacing } from '@/theme';

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
      <FormSection title="Password">
        <TextField
          label="Current password"
          secureTextEntry
          textContentType="password"
          autoComplete="password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="••••••••"
          containerStyle={styles.field}
        />
        <TextField
          label="New password"
          secureTextEntry
          textContentType="newPassword"
          autoComplete="password-new"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="At least 8 characters"
          containerStyle={styles.field}
        />
        <TextField
          label="Confirm new password"
          secureTextEntry
          textContentType="newPassword"
          autoComplete="password-new"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="••••••••"
          containerStyle={styles.fieldLast}
        />
      </FormSection>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Save password"
        loading={submitting}
        onPress={() => void handleSubmit()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.md,
  },
  fieldLast: {
    marginBottom: 0,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
