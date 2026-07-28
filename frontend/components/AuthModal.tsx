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
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { googleProfileHintRequest } from '../services/authApi';
import LegalDocumentModal from './LegalDocumentModal';
import type { UserGender } from '../types/user';
import { getModalBackdropResponder } from '../utils/modalBackdrop';
import { calculateAge, getDaysInMonth } from '../utils/dateUtils';
import { C, R, S } from '../constants/theme';

WebBrowser.maybeCompleteAuthSession();

type Props = {
  visible: boolean;
  onClose: () => void;
};

type AuthTab = 'login' | 'register' | 'forgot' | 'google-complete';

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


export default function AuthModal({ visible, onClose }: Props) {
  const { login, register, forgotPassword, loginFromTokens, completeGoogleProfile } = useAuth();

  const defaultBirth = getDefaultBirthDateParts();

  const [tab, setTab] = useState<AuthTab>('login');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [legalDoc, setLegalDoc] = useState<'privacy' | 'terms' | null>(null);

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
  const [gender, setGender] = useState<UserGender>('unknown');

  const [birthYear, setBirthYear] = useState(defaultBirth.year);
  const [birthMonth, setBirthMonth] = useState(defaultBirth.month);
  const [birthDay, setBirthDay] = useState(defaultBirth.day);

  const [forgotEmail, setForgotEmail] = useState('');

  const [googleTempToken, setGoogleTempToken] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');

  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentGiftBot, setConsentGiftBot] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);

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
    setGender('unknown');
    setBirthYear(freshDefault.year);
    setBirthMonth(freshDefault.month);
    setBirthDay(freshDefault.day);
    setForgotEmail('');
    setGoogleTempToken('');
    setGoogleEmail('');
    setConsentPrivacy(false);
    setConsentGiftBot(false);
    setConsentMarketing(false);
    clearMessages();
  };

  const handleGooglePress = async () => {
    try {
      clearMessages();
      setSubmitting(true);
      const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
      const redirectUri = Linking.createURL('google-auth');
      const startUrl = `${apiBase}/auth/google/oauth-start?redirectUri=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);
      if (result.type !== 'success' || !result.url) return;
      const { queryParams } = Linking.parse(result.url);
      if (!queryParams) return;
      if (queryParams.error) {
        const err = String(queryParams.error);
        if (err !== 'cancelled') setErrorMessage('Autentificarea Google a eșuat.');
        return;
      }
      if (queryParams.token) {
        await loginFromTokens(
          String(queryParams.token),
          String(queryParams.refreshToken ?? ''),
          String(queryParams.expiresIn ?? '3600')
        );
        handleClose();
        return;
      }
      if (queryParams.needsProfile === 'true' && queryParams.tempToken) {
        const token = String(queryParams.tempToken);
        setGoogleTempToken(token);
        try {
          const hint = await googleProfileHintRequest(token);
          setGoogleEmail(hint.googleEmail);
          setFirstName(hint.googleFirstName);
          setLastName(hint.googleLastName);
        } catch {
          // hints are optional — form stays empty but still functional
        }
        switchTab('google-complete');
      }
    } catch {
      setErrorMessage('Autentificarea Google a eșuat.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleComplete = async () => {
    if (!consentPrivacy) {
      setErrorMessage('Trebuie să accepți Politica de confidențialitate și Termenii și condițiile.');
      return;
    }
    try {
      clearMessages();
      setSubmitting(true);
      await completeGoogleProfile(
        googleTempToken,
        firstName.trim(),
        lastName.trim(),
        birthDate,
        gender,
        { privacyAndTerms: true, giftBot: consentGiftBot, marketing: consentMarketing }
      );
      handleClose();
    } catch (e: any) {
      setErrorMessage(e?.message || 'Nu am putut crea contul.');
    } finally {
      setSubmitting(false);
    }
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
    consentPrivacy &&
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
        role: 'client',
        consent: { privacyAndTerms: true, giftBot: consentGiftBot, marketing: consentMarketing },
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

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>sau</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  style={[styles.googleButton, submitting && styles.disabledButton]}
                  onPress={handleGooglePress}
                  disabled={submitting}
                >
                  <Text style={styles.googleButtonG}>G</Text>
                  <Text style={styles.googleButtonText}>Continuă cu Google</Text>
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

                <View style={styles.consentSection}>
                  <Pressable style={styles.consentRow} onPress={() => setConsentPrivacy((v) => !v)}>
                    <View style={[styles.checkbox, consentPrivacy && styles.checkboxChecked]}>
                      {consentPrivacy && <Text style={styles.checkboxTick}>✓</Text>}
                    </View>
                    <Text style={styles.consentText}>
                      <Text style={styles.consentRequired}>* </Text>
                      Accept{' '}
                      <Text style={styles.consentLink} onPress={() => setLegalDoc('privacy')}>
                        Politica de confidențialitate
                      </Text>
                      {' '}și{' '}
                      <Text style={styles.consentLink} onPress={() => setLegalDoc('terms')}>
                        Termenii și condițiile
                      </Text>
                    </Text>
                  </Pressable>
                  <Pressable style={styles.consentRow} onPress={() => setConsentGiftBot((v) => !v)}>
                    <View style={[styles.checkbox, consentGiftBot && styles.checkboxChecked]}>
                      {consentGiftBot && <Text style={styles.checkboxTick}>✓</Text>}
                    </View>
                    <Text style={styles.consentText}>
                      Sunt de acord cu procesarea datelor pentru GiftBot (recomandări AI personalizate)
                    </Text>
                  </Pressable>
                  <Pressable style={styles.consentRow} onPress={() => setConsentMarketing((v) => !v)}>
                    <View style={[styles.checkbox, consentMarketing && styles.checkboxChecked]}>
                      {consentMarketing && <Text style={styles.checkboxTick}>✓</Text>}
                    </View>
                    <Text style={styles.consentText}>
                      Doresc să primesc oferte și noutăți prin email
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

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>sau</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  style={[styles.googleButton, submitting && styles.disabledButton]}
                  onPress={handleGooglePress}
                  disabled={submitting}
                >
                  <Text style={styles.googleButtonG}>G</Text>
                  <Text style={styles.googleButtonText}>Continuă cu Google</Text>
                </Pressable>
              </>
            )}

            {tab === 'google-complete' && (
              <>
                <Text style={styles.title}>Completează profilul</Text>
                <Text style={styles.googleEmailLabel}>{googleEmail}</Text>

                {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

                <TextInput
                  style={styles.input}
                  placeholder="Nume"
                  value={lastName}
                  onChangeText={(v) => { setLastName(v); clearMessages(); }}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Prenume"
                  value={firstName}
                  onChangeText={(v) => { setFirstName(v); clearMessages(); }}
                />

                <Text style={styles.label}>Data nașterii</Text>
                <View style={styles.dateRow}>
                  <View style={styles.datePickerWrapper}>
                    <Picker selectedValue={birthDay} onValueChange={(v) => setBirthDay(Number(v))}>
                      {days.map((d) => <Picker.Item key={d} label={String(d)} value={d} />)}
                    </Picker>
                  </View>
                  <View style={styles.datePickerWrapper}>
                    <Picker selectedValue={birthMonth} onValueChange={(v) => { const m = Number(v); setBirthMonth(m); if (birthDay > getDaysInMonth(birthYear, m)) setBirthDay(getDaysInMonth(birthYear, m)); }}>
                      {months.map((m) => <Picker.Item key={m} label={pad(m)} value={m} />)}
                    </Picker>
                  </View>
                  <View style={styles.datePickerWrapper}>
                    <Picker selectedValue={birthYear} onValueChange={(v) => { const y = Number(v); setBirthYear(y); if (birthDay > getDaysInMonth(y, birthMonth)) setBirthDay(getDaysInMonth(y, birthMonth)); }}>
                      {years.map((y) => <Picker.Item key={y} label={String(y)} value={y} />)}
                    </Picker>
                  </View>
                </View>
                <Text style={[styles.helperText, !isAgeValid && styles.errorTextInline]}>
                  {isAgeValid ? `✔ Vârsta este validă (${age} ani)` : 'Trebuie să ai cel puțin 16 ani.'}
                </Text>

                <Text style={styles.label}>Gen</Text>
                <View style={styles.genderRow}>
                  {([{ value: 'male', label: 'Masculin' }, { value: 'female', label: 'Feminin' }, { value: 'unknown', label: 'Nespecificat' }] as const).map((o) => (
                    <Pressable key={o.value} style={[styles.genderButton, gender === o.value && styles.genderButtonActive]} onPress={() => setGender(o.value)}>
                      <Text style={[styles.genderButtonText, gender === o.value && styles.genderButtonTextActive]}>{o.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.consentSection}>
                  <Pressable style={styles.consentRow} onPress={() => setConsentPrivacy((v) => !v)}>
                    <View style={[styles.checkbox, consentPrivacy && styles.checkboxChecked]}>
                      {consentPrivacy && <Text style={styles.checkboxTick}>✓</Text>}
                    </View>
                    <Text style={styles.consentText}>
                      <Text style={styles.consentRequired}>* </Text>
                      Accept{' '}
                      <Text style={styles.consentLink} onPress={() => setLegalDoc('privacy')}>
                        Politica de confidențialitate
                      </Text>
                      {' '}și{' '}
                      <Text style={styles.consentLink} onPress={() => setLegalDoc('terms')}>
                        Termenii și condițiile
                      </Text>
                    </Text>
                  </Pressable>
                  <Pressable style={styles.consentRow} onPress={() => setConsentGiftBot((v) => !v)}>
                    <View style={[styles.checkbox, consentGiftBot && styles.checkboxChecked]}>
                      {consentGiftBot && <Text style={styles.checkboxTick}>✓</Text>}
                    </View>
                    <Text style={styles.consentText}>
                      Sunt de acord cu procesarea datelor pentru GiftBot (recomandări AI personalizate)
                    </Text>
                  </Pressable>
                  <Pressable style={styles.consentRow} onPress={() => setConsentMarketing((v) => !v)}>
                    <View style={[styles.checkbox, consentMarketing && styles.checkboxChecked]}>
                      {consentMarketing && <Text style={styles.checkboxTick}>✓</Text>}
                    </View>
                    <Text style={styles.consentText}>
                      Doresc să primesc oferte și noutăți prin email
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  style={[styles.actionButton, (submitting || !firstName.trim() || !lastName.trim() || !isAgeValid || !consentPrivacy) && styles.disabledButton]}
                  onPress={handleGoogleComplete}
                  disabled={submitting || !firstName.trim() || !lastName.trim() || !isAgeValid || !consentPrivacy}
                >
                  <Text style={styles.actionButtonText}>{submitting ? 'Se procesează...' : 'Creează contul'}</Text>
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

      <LegalDocumentModal type={legalDoc} onClose={() => setLegalDoc(null)} />
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: C.border,
  },
  dividerText: {
    color: C.textFaint,
    fontSize: 13,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.pill,
    paddingVertical: 13,
    backgroundColor: C.surface2,
  },
  googleButtonG: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  googleEmailLabel: {
    fontSize: 14,
    color: C.textDim,
    marginBottom: 16,
    textAlign: 'center',
  },
  consentSection: {
    marginTop: 4,
    marginBottom: 12,
    gap: 10,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  checkboxTick: {
    color: C.accentInk,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    color: C.textDim,
    lineHeight: 18,
  },
  consentRequired: {
    color: C.danger,
    fontWeight: '700',
  },
  consentLink: {
    color: C.accent,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
