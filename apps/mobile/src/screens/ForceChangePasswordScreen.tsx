import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { changePasswordRequest } from '@/api/auth';
import { getErrorMessage, useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme/colors';

export function ForceChangePasswordScreen() {
  const { logout } = useAuth();
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (temporaryPassword.length < 8) {
      setError('Enter the temporary password you signed in with');
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
    if (temporaryPassword === newPassword) {
      setError('New password must be different from the temporary password');
      return;
    }

    setSubmitting(true);
    try {
      await changePasswordRequest({
        newPassword,
        currentPassword: temporaryPassword,
      });
      await logout();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not change password'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.eyebrow}>LUXARIA DEVELOPERS</Text>
        <Text style={styles.title}>Set permanent password</Text>
        <Text style={styles.lede}>
          You signed in with a temporary password. Choose a new permanent
          password to continue.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Temporary password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            textContentType="password"
            autoComplete="password"
            value={temporaryPassword}
            onChangeText={setTemporaryPassword}
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
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={() => void handleSubmit()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save permanent password</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.secondary}
          disabled={submitting}
          onPress={() => void logout()}
        >
          <Text style={styles.secondaryText}>Sign out</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  eyebrow: {
    color: colors.secondary,
    letterSpacing: 2,
    fontSize: 12,
    marginBottom: 12,
  },
  title: {
    color: '#F4F0E6',
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 10,
  },
  lede: {
    color: '#D9D3C4',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    color: '#E8E2D4',
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: {
    color: '#F5C2C0',
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 16,
  },
  secondary: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryText: {
    color: '#D9D3C4',
    fontWeight: '600',
    fontSize: 15,
  },
});
