import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import type { AppRole, UserGender } from '../types/user';
import { getModalBackdropResponder } from '../utils/modalBackdrop';
import { C, R, S } from '../constants/theme';

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
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<AppRole>('client');
  const [gender, setGender] = useState<UserGender>('unknown');

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
    setShowLoginPassword(false);
    setFirstName('');
    setLastName('');
    setRegisterEmail('');
    setRegisterPassword('');
    setConfirmPassword('');
    setShowRegisterPassword(false);
    setShowConfirmPassword(false);
    setRole('client');
    setGender('unknown');
    setBirthYear(freshDefault.year);
    setBirthMonth(freshDefault.month);
    setBirthDay(freshDefault.day);
    setForgotEmail('');
    clearMessages();
  };

  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 4,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || gs.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: 800,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            handleClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  const handleClose = () => {
    resetFields();
    setTab('login');
    onClose();
  };

  const switchTab = (nextTab: AuthTab) => {
    setTab(nextTab);
    clearMessages();
  };

  const openForgotPassword = () => {
    setForgotEmail(loginEmail.trim());
    switchTab('forgot');
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
        gender,
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
      <View style={styles.overlay} {...getModalBackdropResponder(handleClose)}>
        <Animated.View style={[styles.modalCard, { transform: [{ translateY }] }]}>
          <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
            <View style={styles.dragHandleBar} />
          </View>
          <View style={styles.tabsRow}>
            <Pressable
              onPress={() => switchTab('login')}
              style={[styles.tabButton, tab === 'login' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>
                Autentificare
              </Text>
            </Pressable>

            <Pressable
              onPress={() => switchTab('register')}
              style={[styles.tabButton, tab === 'register' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>
                Inregistrare
              </Text>
            </Pressable>

            <Pressable
              onPress={() => switchTab('forgot')}
              style={[styles.tabButton, tab === 'forgot' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabText, tab === 'forgot' && styles.tabTextActive]}>
                Resetare Parola
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

                <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Parolă"
                  value={loginPassword}
                  onChangeText={(value) => {
                    setLoginPassword(value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  secureTextEntry={!showLoginPassword}
                  autoCapitalize="none"
                />
                  <Pressable
                    style={({ hovered, pressed }) => [
                      styles.passwordRevealButton,
                      hovered && styles.passwordRevealButtonHover,
                      pressed && styles.passwordRevealButtonPressed,
                    ]}
                    onPress={() => setShowLoginPassword((current) => !current)}
                  >
                    <Text style={styles.passwordRevealText}>
                      {showLoginPassword ? 'Ascunde' : 'Arata'}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.forgotPasswordLink,
                    hovered && styles.forgotPasswordLinkHover,
                    pressed && styles.forgotPasswordLinkPressed,
                  ]}
                  onPress={openForgotPassword}
                >
                  <Text style={styles.forgotPasswordLinkText}>Ai uitat parola?</Text>
                </Pressable>

                <Pressable
                  style={[styles.actionButton, submitting && styles.disabledButton]}
                  onPress={handleLogin}
                  disabled={submitting}
                >
                  <Text style={styles.actionButtonText}>
                    {submitting ? 'Se procesează...' : 'Autentificare'}
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

                <Text style={styles.label}>Gen</Text>

                <View style={styles.genderRow}>
                  {[
                    { value: 'male', label: 'Masculin' },
                    { value: 'female', label: 'Feminin' },
                    { value: 'unknown', label: 'Nespecificat' },
                  ].map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.genderButton,
                        gender === option.value && styles.genderButtonActive,
                      ]}
                      onPress={() => setGender(option.value as UserGender)}
                    >
                      <Text
                        style={[
                          styles.genderButtonText,
                          gender === option.value && styles.genderButtonTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

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

                <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Parolă"
                  value={registerPassword}
                  onChangeText={(value) => {
                    setRegisterPassword(value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  secureTextEntry={!showRegisterPassword}
                  autoCapitalize="none"
                />
                  <Pressable
                    style={({ hovered, pressed }) => [
                      styles.passwordRevealButton,
                      hovered && styles.passwordRevealButtonHover,
                      pressed && styles.passwordRevealButtonPressed,
                    ]}
                    onPress={() =>
                      setShowRegisterPassword((current) => !current)
                    }
                  >
                    <Text style={styles.passwordRevealText}>
                      {showRegisterPassword ? 'Ascunde' : 'Arata'}
                    </Text>
                  </Pressable>
                </View>

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
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                  <Pressable
                    style={({ hovered, pressed }) => [
                      styles.passwordRevealInlineButton,
                      hovered && styles.passwordRevealButtonHover,
                      pressed && styles.passwordRevealButtonPressed,
                    ]}
                    onPress={() => setShowConfirmPassword((current) => !current)}
                  >
                    <Text style={styles.passwordRevealText}>
                      {showConfirmPassword ? 'Ascunde' : 'Arata'}
                    </Text>
                  </Pressable>

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
                    {submitting ? 'Se procesează...' : 'Inregistrare'}
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
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(31,27,22,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xxl,
    borderTopRightRadius: R.xxl,
    maxHeight: '90%',
    paddingBottom: 24,
    ...S.float,
  },
  dragHandleArea: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.borderStrong,
  },
  tabsRow: {
    flexDirection: 'row',
    padding: 14,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: R.pill,
    backgroundColor: C.surface2,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.border,
  },
  tabButtonActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  tabText: {
    color: C.textDim,
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: C.accentInk,
    fontWeight: '600',
  },
  body: {
    padding: 16,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '400',
    color: C.text,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  input: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    backgroundColor: C.surface2,
    fontSize: 15,
    color: C.text,
  },
  passwordInputWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  passwordInput: {
    marginBottom: 0,
    paddingRight: 92,
  },
  passwordRevealButton: {
    position: 'absolute',
    right: 8,
    top: 7,
    borderRadius: R.sm,
    backgroundColor: C.accentSoft,
    borderWidth: 0.5,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  passwordRevealInlineButton: {
    alignSelf: 'flex-end',
    borderRadius: R.sm,
    backgroundColor: C.accentSoft,
    borderWidth: 0.5,
    borderColor: C.border,
    marginTop: -6,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  passwordRevealButtonHover: {
    backgroundColor: C.surface2,
  },
  passwordRevealButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  passwordRevealText: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: -2,
    marginBottom: 14,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  forgotPasswordLinkHover: {
    opacity: 0.8,
  },
  forgotPasswordLinkPressed: {
    transform: [{ scale: 0.98 }],
  },
  forgotPasswordLinkText: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textDim,
    marginBottom: 8,
    marginTop: 4,
  },
  helperText: {
    fontSize: 13,
    marginBottom: 12,
    color: C.textFaint,
  },
  errorTextInline: {
    color: C.danger,
  },
  successTextInline: {
    color: C.sage,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  datePickerWrapper: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    overflow: 'hidden',
    backgroundColor: C.surface2,
  },
  rulesBox: {
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 14,
    marginBottom: 12,
  },
  ruleText: {
    fontSize: 13,
    color: C.textFaint,
    marginBottom: 6,
  },
  ruleTextOk: {
    color: C.sage,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: R.pill,
    backgroundColor: C.surface2,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.border,
  },
  roleButtonActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  roleButtonText: {
    fontWeight: '600',
    color: C.textDim,
    fontSize: 14,
  },
  roleButtonTextActive: {
    color: C.accentInk,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: R.pill,
    backgroundColor: C.surface2,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.border,
  },
  genderButtonActive: {
    backgroundColor: C.warn,
    borderColor: C.warn,
  },
  genderButtonText: {
    fontWeight: '600',
    color: C.textDim,
    fontSize: 14,
  },
  genderButtonTextActive: {
    color: C.accentInk,
  },
  actionButton: {
    backgroundColor: C.accent,
    borderRadius: R.pill,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: C.accentInk,
    fontWeight: '600',
    fontSize: 15,
  },
  closeButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  closeButtonText: {
    color: C.textFaint,
    fontWeight: '500',
    fontSize: 14,
  },
  errorText: {
    color: C.danger,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    backgroundColor: C.dangerBg,
    borderRadius: R.sm,
    padding: 10,
    borderWidth: 0.5,
    borderColor: C.borderStrong,
  },
  successText: {
    color: C.sage,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    backgroundColor: C.sageBg,
    borderRadius: R.sm,
    padding: 10,
    borderWidth: 0.5,
    borderColor: C.borderStrong,
  },
});
