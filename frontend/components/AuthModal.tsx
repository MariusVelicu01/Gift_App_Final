import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import type { AppRole } from '../types/user';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type AuthTab = 'login' | 'register' | 'forgot';

export default function AuthModal({ visible, onClose }: Props) {
  const { login, register, forgotPassword } = useAuth();

  const [tab, setTab] = useState<AuthTab>('login');
  const [submitting, setSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [role, setRole] = useState<AppRole>('client');

  const [forgotEmail, setForgotEmail] = useState('');

  const resetFields = () => {
    setLoginEmail('');
    setLoginPassword('');
    setFirstName('');
    setLastName('');
    setRegisterEmail('');
    setRegisterPassword('');
    setRole('client');
    setForgotEmail('');
  };

  const handleClose = () => {
    resetFields();
    setTab('login');
    onClose();
  };

  const handleLogin = async () => {
    try {
      setSubmitting(true);
      await login(loginEmail, loginPassword);
      handleClose();
    } catch (error: any) {
      Alert.alert('Eroare', error?.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    try {
      setSubmitting(true);
      await register({
        firstName,
        lastName,
        email: registerEmail,
        password: registerPassword,
        role,
      });
      handleClose();
    } catch (error: any) {
      Alert.alert('Eroare', error?.message || 'Register failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      setSubmitting(true);
      await forgotPassword(forgotEmail);
      Alert.alert('Succes', 'Email-ul pentru resetarea parolei a fost trimis.');
      setTab('login');
    } catch (error: any) {
      Alert.alert('Eroare', error?.message || 'Failed to send reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.tabsRow}>
            <Pressable onPress={() => setTab('login')} style={[styles.tabButton, tab === 'login' && styles.tabButtonActive]}>
              <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>Login</Text>
            </Pressable>
            <Pressable onPress={() => setTab('register')} style={[styles.tabButton, tab === 'register' && styles.tabButtonActive]}>
              <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>Register</Text>
            </Pressable>
            <Pressable onPress={() => setTab('forgot')} style={[styles.tabButton, tab === 'forgot' && styles.tabButtonActive]}>
              <Text style={[styles.tabText, tab === 'forgot' && styles.tabTextActive]}>Forgot</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {tab === 'login' && (
              <>
                <Text style={styles.title}>Autentificare</Text>
                <TextInput style={styles.input} placeholder="Email" value={loginEmail} onChangeText={setLoginEmail} autoCapitalize="none" keyboardType="email-address" />
                <TextInput style={styles.input} placeholder="Parolă" value={loginPassword} onChangeText={setLoginPassword} secureTextEntry />
                <Pressable style={styles.actionButton} onPress={handleLogin} disabled={submitting}>
                  <Text style={styles.actionButtonText}>{submitting ? 'Se procesează...' : 'Login'}</Text>
                </Pressable>
              </>
            )}

            {tab === 'register' && (
              <>
                <Text style={styles.title}>Înregistrare</Text>
                <TextInput style={styles.input} placeholder="Prenume" value={firstName} onChangeText={setFirstName} />
                <TextInput style={styles.input} placeholder="Nume" value={lastName} onChangeText={setLastName} />
                <TextInput style={styles.input} placeholder="Email" value={registerEmail} onChangeText={setRegisterEmail} autoCapitalize="none" keyboardType="email-address" />
                <TextInput style={styles.input} placeholder="Parolă" value={registerPassword} onChangeText={setRegisterPassword} secureTextEntry />

                <Text style={styles.label}>Rol</Text>
                <View style={styles.roleRow}>
                  <Pressable
                    style={[styles.roleButton, role === 'client' && styles.roleButtonActive]}
                    onPress={() => setRole('client')}
                  >
                    <Text style={[styles.roleButtonText, role === 'client' && styles.roleButtonTextActive]}>
                      Client
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.roleButton, role === 'admin' && styles.roleButtonActive]}
                    onPress={() => setRole('admin')}
                  >
                    <Text style={[styles.roleButtonText, role === 'admin' && styles.roleButtonTextActive]}>
                      Admin
                    </Text>
                  </Pressable>
                </View>

                <Pressable style={styles.actionButton} onPress={handleRegister} disabled={submitting}>
                  <Text style={styles.actionButtonText}>{submitting ? 'Se procesează...' : 'Register'}</Text>
                </Pressable>
              </>
            )}

            {tab === 'forgot' && (
              <>
                <Text style={styles.title}>Resetare parolă</Text>
                <TextInput style={styles.input} placeholder="Email" value={forgotEmail} onChangeText={setForgotEmail} autoCapitalize="none" keyboardType="email-address" />
                <Pressable style={styles.actionButton} onPress={handleForgotPassword} disabled={submitting}>
                  <Text style={styles.actionButtonText}>{submitting ? 'Se procesează...' : 'Trimite email'}</Text>
                </Pressable>
              </>
            )}

            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>Închide</Text>
            </Pressable>
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
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '88%',
    paddingBottom: 20,
  },
  tabsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#111827',
  },
  tabText: {
    color: '#111827',
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#fff',
  },
  body: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    marginTop: 4,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#2563eb',
  },
  roleButtonText: {
    fontWeight: '700',
    color: '#111827',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  actionButton: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  closeButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  closeButtonText: {
    color: '#6b7280',
    fontWeight: '700',
  },
});