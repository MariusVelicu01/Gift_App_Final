import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import type { AppRole } from '../src/types/user';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type AuthTab = 'login' | 'register';

const initialRegisterState = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  role: 'client' as AppRole,
  email: '',
  password: '',
  confirmPassword: '',
};

export default function AuthModal({ visible, onClose }: Props) {
  const { login, register, resetPassword } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [submitting, setSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerForm, setRegisterForm] = useState(initialRegisterState);

  const title = useMemo(
    () => (activeTab === 'login' ? 'Autentificare' : 'Creare cont'),
    [activeTab]
  );

  const updateRegisterField = (
    field: keyof typeof initialRegisterState,
    value: string
  ) => {
    setRegisterForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogin = async () => {
    try {
      setSubmitting(true);
      await login(loginEmail, loginPassword);
      Alert.alert('Succes', 'Te-ai conectat cu succes.');
      onClose();
    } catch (error) {
      Alert.alert('Eroare', error instanceof Error ? error.message : 'Login eșuat.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    try {
      setSubmitting(true);
      await register(registerForm);
      Alert.alert('Succes', 'Contul a fost creat cu succes.');
      onClose();
      setRegisterForm(initialRegisterState);
    } catch (error) {
      Alert.alert(
        'Eroare',
        error instanceof Error ? error.message : 'Înregistrarea a eșuat.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      setSubmitting(true);
      await resetPassword(loginEmail);
      Alert.alert(
        'Email trimis',
        'Verifică adresa de email pentru resetarea parolei.'
      );
    } catch (error) {
      Alert.alert(
        'Eroare',
        error instanceof Error ? error.message : 'Resetarea parolei a eșuat.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeText}>Închide</Text>
            </Pressable>
          </View>

          <View style={styles.tabs}>
            <Pressable
              style={[styles.tabButton, activeTab === 'login' && styles.activeTabButton]}
              onPress={() => setActiveTab('login')}
            >
              <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>
                Login
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabButton, activeTab === 'register' && styles.activeTabButton]}
              onPress={() => setActiveTab('register')}
            >
              <Text
                style={[styles.tabText, activeTab === 'register' && styles.activeTabText]}
              >
                Create Account
              </Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {activeTab === 'login' ? (
              <View style={styles.form}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                />

                <Text style={styles.label}>Parolă</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Parolă"
                  secureTextEntry
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                />

                <Pressable
                  style={[styles.primaryButton, submitting && styles.disabledButton]}
                  onPress={handleLogin}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Login</Text>
                  )}
                </Pressable>

                <Pressable onPress={handleForgotPassword} disabled={submitting}>
                  <Text style={styles.linkText}>Forgot Password</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.form}>
                <Text style={styles.label}>Nume</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nume"
                  value={registerForm.firstName}
                  onChangeText={(value) => updateRegisterField('firstName', value)}
                />

                <Text style={styles.label}>Prenume</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Prenume"
                  value={registerForm.lastName}
                  onChangeText={(value) => updateRegisterField('lastName', value)}
                />

                <Text style={styles.label}>Data nașterii</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={registerForm.dateOfBirth}
                  onChangeText={(value) => updateRegisterField('dateOfBirth', value)}
                />

                <Text style={styles.label}>Gen</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Masculin / Feminin / Altul"
                  value={registerForm.gender}
                  onChangeText={(value) => updateRegisterField('gender', value)}
                />

                <Text style={styles.label}>Rol</Text>
                <View style={styles.radioRow}>
                  <Pressable
                    style={[
                      styles.roleButton,
                      registerForm.role === 'client' && styles.roleButtonActive,
                    ]}
                    onPress={() => updateRegisterField('role', 'client')}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        registerForm.role === 'client' && styles.roleTextActive,
                      ]}
                    >
                      Client
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.roleButton,
                      registerForm.role === 'admin' && styles.roleButtonActive,
                    ]}
                    onPress={() => updateRegisterField('role', 'admin')}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        registerForm.role === 'admin' && styles.roleTextActive,
                      ]}
                    >
                      Administrator
                    </Text>
                  </Pressable>
                </View>

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={registerForm.email}
                  onChangeText={(value) => updateRegisterField('email', value)}
                />

                <Text style={styles.label}>Parolă</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Parolă"
                  secureTextEntry
                  value={registerForm.password}
                  onChangeText={(value) => updateRegisterField('password', value)}
                />

                <Text style={styles.label}>Confirmă parola</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirmă parola"
                  secureTextEntry
                  value={registerForm.confirmPassword}
                  onChangeText={(value) => updateRegisterField('confirmPassword', value)}
                />

                <Pressable
                  style={[styles.primaryButton, submitting && styles.disabledButton]}
                  onPress={handleRegister}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Înregistrare</Text>
                  )}
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  closeText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 14,
    marginBottom: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  tabText: {
    color: '#111827',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  form: {
    gap: 10,
    paddingBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#fff',
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  linkText: {
    marginTop: 8,
    color: '#2563eb',
    fontWeight: '600',
    textAlign: 'center',
  },
  radioRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  roleText: {
    color: '#111827',
    fontWeight: '600',
  },
  roleTextActive: {
    color: '#2563eb',
  },
});