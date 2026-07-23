import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getErrorMessage, useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme/colors';

const logo = require('../../assets/luxaria-logo-sm.png');

export function LoginScreen() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Enter your email/mobile and password');
      return;
    }
    setSubmitting(true);
    try {
      await login({
        identifier: identifier.trim(),
        password,
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'));
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
        <Image
          source={logo}
          style={styles.logo}
          accessibilityLabel="Luxaria Developers"
          resizeMode="contain"
        />
        <Text style={styles.title}>Site login</Text>
        <Text style={styles.lede}>
          Sign in with your email or mobile number to continue.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email or mobile</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="you@luxaria.in"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            textContentType="password"
            value={password}
            onChangeText={setPassword}
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
            <Text style={styles.buttonText}>Sign in</Text>
          )}
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
  logo: {
    width: 96,
    height: 96,
    marginBottom: 16,
    borderRadius: 8,
  },
  title: {
    color: '#F4F0E6',
    fontSize: 34,
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
});
