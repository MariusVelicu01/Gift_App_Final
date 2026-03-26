import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import type { AppRole } from '../types/user';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type AuthTab = 'login' | 'register' | 'forgot';

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

function getDefaultBirthDateParts() {
  const today = new Date();
  return {
    year: today.getFullYear() - 16,
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
}

function buildBirthDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function calculateAge(dateString: string) {
  const birth = new Date(dateString);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export default function AuthModal({ visible, onClose }: Props) {
  const { login, register, forgotPassword } = useAuth();

  const defaultBirth = getDefaultBirthDateParts();

  const [tab, setTab] = useState<AuthTab>('login');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<AppRole>('client');

  const [birthYear, setBirthYear] = useState(defaultBirth.year);
  const [birthMonth, setBirthMonth] = useState(defaultBirth.month);
  const [birthDay, setBirthDay] = useState(defaultBirth.day);

  const [forgotEmail, setForgotEmail] = useState('');

  const clearMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const resetFields = () => {
    const freshDefault = getDefaultBirthDateParts();

    setLoginEmail('');
    setLoginPassword('');
    setFirstName('');
    setLastName('');
    setRegisterEmail('');
    setRegisterPassword('');
    setConfirmPassword('');
    setRole('client');
    setBirthYear(freshDefault.year);
    setBirthMonth(freshDefault.month);
    setBirthDay(freshDefault.day);
    setForgotEmail('');
    clearMessages();
  };

  const handleClose = () => {
    resetFields();
    setTab('login');
    onClose();
  };

  const switchTab = (nextTab: AuthTab) => {
    setTab(nextTab);
    clearMessages();
  };

  const birthDate = useMemo(() => {
    return buildBirthDate(birthYear, birthMonth, birthDay);
  }, [birthYear, birthMonth, birthDay]);

  const age = useMemo(() => calculateAge(birthDate), [birthDate]);

  const passwordChecks = useMemo(() => {
    return {
      minLength: registerPassword.length >= 8,
      uppercase: /[A-Z]/.test(registerPassword),
      lowercase: /[a-z]/.test(registerPassword),
      digit: /\d/.test(registerPassword),
      special: /[^A-Za-z0-9]/.test(registerPassword),
    };
  }, [registerPassword]);

  const isPasswordValid =
    passwordChecks.minLength &&
    passwordChecks.uppercase &&
    passwordChecks.lowercase &&
    passwordChecks.digit &&
    passwordChecks.special;

  const doPasswordsMatch =
    confirmPassword.length > 0 && registerPassword === confirmPassword;

  const isAgeValid = age !== null && age >= 16;

  const isRegisterButtonEnabled =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    registerEmail.trim().length > 0 &&
    isPasswordValid &&
    doPasswordsMatch &&
    isAgeValid &&
    !submitting;

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const result: number[] = [];
    for (let y = currentYear - 100; y <= currentYear - 16; y++) {
      result.push(y);
    }
    return result.reverse();
  }, []);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const days = useMemo(() => {
    const count = getDaysInMonth(birthYear, birthMonth);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [birthYear, birthMonth]);

  const handleLogin = async () => {
    try {
      clearMessages();
      setSubmitting(true);
      await login(loginEmail.trim(), loginPassword);
      handleClose();
    } catch {
      setErrorMessage('Emailul sau parola sunt greșite.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    try {
      clearMessages();

      if (!isRegisterButtonEnabled) {
        setErrorMessage('Completează corect toate câmpurile.');
        return;
      }

      setSubmitting(true);

      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate,
        email: registerEmail.trim(),
        password: registerPassword,
        role,
      });

      handleClose();
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();

      if (message.includes('există deja') || message.includes('already')) {
        setErrorMessage('Există deja un cont asociat acestui email.');
      } else {
        setErrorMessage('Nu am putut crea contul. Verifică datele și încearcă din nou.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      clearMessages();
      setSubmitting(true);
      await forgotPassword(forgotEmail.trim());
      setSuccessMessage('A fost trimis un email pentru resetarea parolei.');
    } catch {
      setErrorMessage('Nu am putut trimite emailul de resetare.');
    } finally {
      setSubmitting(false);
    }
  };

  const Rule = ({ ok, text }: { ok: boolean; text: string }) => (
    <Text style={[styles.ruleText, ok && styles.ruleTextOk]}>
      {ok ? '✔ ' : '• '}
      {text}
    </Text>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.tabsRow}>
            <Pressable
              onPress={() => switchTab('login')}
              style={[styles.tabButton, tab === 'login' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>
                Login
              </Text>
            </Pressable>

            <Pressable
              onPress={() => switchTab('register')}
              style={[styles.tabButton, tab === 'register' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>
                Register
              </Text>
            </Pressable>

            <Pressable
              onPress={() => switchTab('forgot')}
              style={[styles.tabButton, tab === 'forgot' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, tab === 'forgot' && styles.tabTextActive]}>
                Forgot
              </Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {tab === 'login' && (
              <>
                <Text style={styles.title}>Autentificare</Text>

                {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={loginEmail}
                  onChangeText={(value) => {
                    setLoginEmail(value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Parolă"
                  value={loginPassword}
                  onChangeText={(value) => {
                    setLoginPassword(value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  secureTextEntry
                />

                <Pressable
                  style={[styles.actionButton, submitting && styles.disabledButton]}
                  onPress={handleLogin}
                  disabled={submitting}
                >
                  <Text style={styles.actionButtonText}>
                    {submitting ? 'Se procesează...' : 'Login'}
                  </Text>
                </Pressable>
              </>
            )}

            {tab === 'register' && (
              <>
                <Text style={styles.title}>Înregistrare</Text>

                {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

                <TextInput
                  style={styles.input}
                  placeholder="Nume"
                  value={lastName}
                  onChangeText={(value) => {
                    setLastName(value);
                    if (errorMessage) setErrorMessage('');
                  }}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Prenume"
                  value={firstName}
                  onChangeText={(value) => {
                    setFirstName(value);
                    if (errorMessage) setErrorMessage('');
                  }}
                />

                <Text style={styles.label}>Data nașterii</Text>

                <View style={styles.dateRow}>
                  <View style={styles.datePickerWrapper}>
                    <Picker
                      selectedValue={birthDay}
                      onValueChange={(value) => setBirthDay(Number(value))}
                    >
                      {days.map((day) => (
                        <Picker.Item key={day} label={String(day)} value={day} />
                      ))}
                    </Picker>
                  </View>

                  <View style={styles.datePickerWrapper}>
                    <Picker
                      selectedValue={birthMonth}
                      onValueChange={(value) => {
                        const nextMonth = Number(value);
                        setBirthMonth(nextMonth);

                        const maxDays = getDaysInMonth(birthYear, nextMonth);
                        if (birthDay > maxDays) {
                          setBirthDay(maxDays);
                        }
                      }}
                    >
                      {months.map((month) => (
                        <Picker.Item key={month} label={pad(month)} value={month} />
                      ))}
                    </Picker>
                  </View>

                  <View style={styles.datePickerWrapper}>
                    <Picker
                      selectedValue={birthYear}
                      onValueChange={(value) => {
                        const nextYear = Number(value);
                        setBirthYear(nextYear);

                        const maxDays = getDaysInMonth(nextYear, birthMonth);
                        if (birthDay > maxDays) {
                          setBirthDay(maxDays);
                        }
                      }}
                    >
                      {years.map((year) => (
                        <Picker.Item key={year} label={String(year)} value={year} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <Text style={[styles.helperText, !isAgeValid && styles.errorTextInline]}>
                  {isAgeValid
                    ? `✔ Vârsta este validă (${age} ani)`
                    : 'Trebuie să ai cel puțin 16 ani.'}
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={registerEmail}
                  onChangeText={(value) => {
                    setRegisterEmail(value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Parolă"
                  value={registerPassword}
                  onChangeText={(value) => {
                    setRegisterPassword(value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  secureTextEntry
                />

                <View style={styles.rulesBox}>
                  <Rule ok={passwordChecks.minLength} text="Minim 8 caractere" />
                  <Rule ok={passwordChecks.uppercase} text="Cel puțin o literă mare" />
                  <Rule ok={passwordChecks.lowercase} text="Cel puțin o literă mică" />
                  <Rule ok={passwordChecks.digit} text="Cel puțin o cifră" />
                  <Rule ok={passwordChecks.special} text="Cel puțin un caracter special" />
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Confirmă parola"
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  secureTextEntry
                />

                {confirmPassword.length > 0 && (
                  <Text
                    style={[
                      styles.helperText,
                      doPasswordsMatch ? styles.successTextInline : styles.errorTextInline,
                    ]}
                  >
                    {doPasswordsMatch
                      ? '✔ Parolele coincid'
                      : 'Parolele nu coincid'}
                  </Text>
                )}

                <Text style={styles.label}>Rol</Text>

                <View style={styles.roleRow}>
                  <Pressable
                    style={[styles.roleButton, role === 'client' && styles.roleButtonActive]}
                    onPress={() => setRole('client')}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        role === 'client' && styles.roleButtonTextActive,
                      ]}
                    >
                      Client
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.roleButton, role === 'admin' && styles.roleButtonActive]}
                    onPress={() => setRole('admin')}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        role === 'admin' && styles.roleButtonTextActive,
                      ]}
                    >
                      Admin
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  style={[
                    styles.actionButton,
                    !isRegisterButtonEnabled && styles.disabledButton,
                  ]}
                  onPress={handleRegister}
                  disabled={!isRegisterButtonEnabled}
                >
                  <Text style={styles.actionButtonText}>
                    {submitting ? 'Se procesează...' : 'Register'}
                  </Text>
                </Pressable>
              </>
            )}

            {tab === 'forgot' && (
              <>
                <Text style={styles.title}>Resetare parolă</Text>

                {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
                {!!successMessage && <Text style={styles.successText}>{successMessage}</Text>}

                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={forgotEmail}
                  onChangeText={(value) => {
                    setForgotEmail(value);
                    clearMessages();
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Pressable
                  style={[styles.actionButton, submitting && styles.disabledButton]}
                  onPress={handleForgotPassword}
                  disabled={submitting}
                >
                  <Text style={styles.actionButtonText}>
                    {submitting ? 'Se procesează...' : 'Trimite email'}
                  </Text>
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
    maxHeight: '90%',
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
  helperText: {
    fontSize: 13,
    marginBottom: 12,
    color: '#374151',
    fontWeight: '600',
  },
  errorTextInline: {
    color: '#dc2626',
  },
  successTextInline: {
    color: '#16a34a',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  datePickerWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  rulesBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  ruleText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 6,
    fontWeight: '600',
  },
  ruleTextOk: {
    color: '#16a34a',
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
  disabledButton: {
    opacity: 0.5,
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
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  successText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
});