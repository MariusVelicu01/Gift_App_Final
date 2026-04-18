import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  prefillEmail?: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => void;
};

export default function SessionExpiredModal({
  visible,
  prefillEmail = '',
  onLogin,
  onLogout,
}: Props) {
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible && prefillEmail) {
      setEmail(prefillEmail);
    }
  }, [prefillEmail, visible]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Completeaza emailul si parola.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await onLogin(email.trim(), password);
      setPassword('');
    } catch (e: any) {
      setError(e?.message || 'Autentificare esuata. Incearca din nou.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>&#x1F512;</Text>
          <Text style={styles.title}>Sesiunea a expirat</Text>
          <Text style={styles.subtitle}>
            Autentificarea ta a expirat. Conecteaza-te din nou pentru a continua.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@exemplu.com"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!submitting}
            />

            <Text style={styles.label}>Parola</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Parola ta"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              editable={!submitting}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={[styles.loginButton, submitting && styles.disabledButton]}
              onPress={handleLogin}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Conecteaza-te din nou</Text>
              )}
            </Pressable>
          </View>

          <Pressable style={styles.logoutButton} onPress={onLogout} disabled={submitting}>
            <Text style={styles.logoutButtonText}>Deconecteaza-te</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 0,
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    color: '#be123c',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
  },
  form: {
    width: '100%',
    gap: 6,
  },
  label: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 2,
  },
  input: {
    backgroundColor: '#fff7ed',
    borderColor: '#fce7e0',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  loginButton: {
    backgroundColor: '#be123c',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  logoutButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  logoutButtonText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '700',
  },
});
