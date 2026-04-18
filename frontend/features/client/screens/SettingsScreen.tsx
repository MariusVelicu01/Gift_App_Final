import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { changePasswordRequest, updateProfileRequest } from '../../../services/authApi';
import { C, R, S } from '../../../constants/theme';

type SettingsSection = 'personalData' | 'notifications';

type Props = {
  onLogout: () => void;
  personalDataOpen: boolean;
  notificationsOpen: boolean;
  onToggleSection: (section: SettingsSection) => void;
};
import {
  ClientSettings,
  DEFAULT_SETTINGS,
  loadClientSettings,
  saveClientSettings,
} from '../../../services/clientSettings';

const PROFILE_PHOTO_KEY_PREFIX = 'gift_app_profile_photo_';

function getProfilePhotoKey(uid?: string) {
  return `${PROFILE_PHOTO_KEY_PREFIX}${uid ?? 'default'}`;
}

function calculateAge(birthDate: string) {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
}

function getZodiac(birthDate: string) {
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return '';
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return 'Berbec \u2648';
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return 'Taur \u2649';
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return 'Gemeni \u264A';
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return 'Rac \u264B';
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 'Leu \u264C';
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 'Fecioara \u264D';
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return 'Balanta \u264E';
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return 'Scorpion \u264F';
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return 'Sagetator \u2650';
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return 'Capricorn \u2651';
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return 'Varsator \u2652';
  return 'Pesti \u2653';
}

function formatBirthDate(birthDate: string) {
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return '-';
  return `${String(date.getDate()).padStart(2, '0')}.${String(
    date.getMonth() + 1
  ).padStart(2, '0')}.${date.getFullYear()}`;
}


export default function SettingsScreen({ onLogout, personalDataOpen, notificationsOpen, onToggleSection }: Props) {
  const { profile, token, refreshProfile } = useAuth();

  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState('');
  const [nameError, setNameError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [settings, setSettings] = useState<ClientSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
    }
  }, [profile]);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (!profile?.uid) {
      setPhotoUri(null);
      return;
    }

    loadPhoto(profile.uid);
  }, [profile]);

  const loadPhoto = async (uid: string) => {
    try {
      const saved = await AsyncStorage.getItem(getProfilePhotoKey(uid));
      if (saved) setPhotoUri(saved);
      else setPhotoUri(null);
    } catch {
      setPhotoUri(null);
    }
  };

  const loadSettings = async () => {
    const s = await loadClientSettings();
    setSettings(s);
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0] && profile?.uid) {
      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setPhotoUri(uri);
      await AsyncStorage.setItem(getProfilePhotoKey(profile.uid), uri);
    }
  };

  const removePhoto = async () => {
    try {
      if (profile?.uid) {
        await AsyncStorage.removeItem(getProfilePhotoKey(profile.uid));
      }
    } catch (error) {
      console.error('REMOVE PROFILE PHOTO ERROR:', error);
    }

    setPhotoUri(null);
  };

  const saveName = async () => {
    setNameMessage('');
    setNameError('');

    if (!firstName.trim() || !lastName.trim()) {
      setNameError('Prenumele si numele nu pot fi goale.');
      return;
    }

    if (!token) return;
    setSavingName(true);

    try {
      await updateProfileRequest(token, firstName.trim(), lastName.trim());
      await refreshProfile();
      setNameMessage('Numele a fost actualizat.');
    } catch (e: any) {
      setNameError(e?.message || 'Nu am putut actualiza numele.');
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async () => {
    setPasswordMessage('');
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Completeaza toate campurile pentru parola.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Parola noua si confirmarea nu coincid.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Parola noua trebuie sa aiba cel putin 6 caractere.');
      return;
    }

    if (!token) return;
    setSavingPassword(true);

    try {
      await changePasswordRequest(token, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Parola a fost schimbata cu succes.');
    } catch (e: any) {
      setPasswordError(e?.message || 'Nu am putut schimba parola.');
    } finally {
      setSavingPassword(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await saveClientSettings(settings);
      setSettingsMessage('Setarile au fost salvate.');
    } catch {
      setSettingsMessage('Nu am putut salva setarile.');
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleAll = (enabled: boolean) => {
    setSettings((s) => ({
      ...s,
      notificationsEnabled: enabled,
      notifyBuyReminder: enabled,
      notifyOfferReminder: enabled,
      notifyPriceUp: enabled,
      notifyPriceDown: enabled,
      notifyBirthdays: enabled,
    }));
    setSettingsMessage('');
  };

  const updateSetting = <K extends keyof ClientSettings>(key: K, value: ClientSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
    setSettingsMessage('');
  };

  const initials = profile
    ? `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.toUpperCase()
    : '?';

  const age = profile?.birthDate ? calculateAge(profile.birthDate) : null;
  const zodiac = profile?.birthDate ? getZodiac(profile.birthDate) : '';
  const birthDateFormatted = profile?.birthDate ? formatBirthDate(profile.birthDate) : '-';
  const roleLabel = profile?.role === 'admin' ? 'Administrator' : 'Client';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Setari</Text>

      {/* --- CONT --- */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cont</Text>
        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile ? `${profile.firstName} ${profile.lastName}` : '-'}
            </Text>
            <Text style={styles.profileEmail}>{profile?.email ?? '-'}</Text>
            <Text style={styles.profileMeta}>Data nasterii: {birthDateFormatted}</Text>
            {age !== null && (
              <Text style={styles.profileMeta}>Varsta: {age} ani</Text>
            )}
            {!!zodiac && <Text style={styles.profileMeta}>Zodie: {zodiac}</Text>}
            <Text style={styles.profileMeta}>Rol: {roleLabel}</Text>
          </View>
        </View>
      </View>

      {/* --- DATE PERSONALE --- */}
      <View style={styles.card}>
        <Pressable
          style={styles.cardHeader}
          onPress={() => onToggleSection('personalData')}
        >
          <Text style={styles.cardTitle}>Date personale</Text>
          <Text style={styles.expandIcon}>{personalDataOpen ? '▾' : '▸'}</Text>
        </Pressable>

        {personalDataOpen && (
          <>
            {/* Photo */}
            <View style={styles.photoSection}>
          <View style={styles.photoPreviewWrap}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : (
              <View style={[styles.photoPreview, styles.photoPreviewFallback]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.photoButtonGroup}>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.photoButton,
                hovered && styles.photoButtonHover,
                pressed && styles.photoButtonPressed,
              ]}
              onPress={pickPhoto}
            >
              <Text style={styles.photoButtonText}>
                {photoUri ? 'Schimba poza' : 'Adauga poza'}
              </Text>
            </Pressable>
            {photoUri && (
              <Pressable
                style={({ hovered, pressed }) => [
                  styles.photoButton,
                  styles.photoDeleteButton,
                  hovered && styles.photoButtonHover,
                  pressed && styles.photoButtonPressed,
                ]}
                onPress={removePhoto}
              >
                <Text style={[styles.photoButtonText, styles.photoDeleteButtonText]}>
                  Sterge poza
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Name */}
        <Text style={styles.sectionLabel}>Modifica numele</Text>
        <View style={styles.inputRow}>
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Prenume</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Prenume"
              placeholderTextColor="#9ca3af"
              editable={!savingName}
            />
          </View>
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Nume</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Nume"
              placeholderTextColor="#9ca3af"
              editable={!savingName}
            />
          </View>
        </View>
        {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}
        {!!nameMessage && <Text style={styles.successText}>{nameMessage}</Text>}
        <Pressable
          style={[styles.saveSmallButton, savingName && styles.disabledButton]}
          onPress={saveName}
          disabled={savingName}
        >
          {savingName ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.saveSmallButtonText}>Salveaza numele</Text>
          )}
        </Pressable>

        <View style={styles.divider} />

        {/* Password */}
        <Text style={styles.sectionLabel}>Schimba parola</Text>
        <Text style={styles.inputLabel}>Parola curenta</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.flex1]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Parola curenta"
            placeholderTextColor="#9ca3af"
            secureTextEntry={!showCurrentPw}
            editable={!savingPassword}
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowCurrentPw((v) => !v)}
          >
            <Text style={styles.eyeText}>{showCurrentPw ? '\uD83D\uDE48' : '\uD83D\uDC41'}</Text>
          </Pressable>
        </View>
        <Text style={styles.inputLabel}>Parola noua</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.flex1]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Parola noua (min. 6 caractere)"
            placeholderTextColor="#9ca3af"
            secureTextEntry={!showNewPw}
            editable={!savingPassword}
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowNewPw((v) => !v)}
          >
            <Text style={styles.eyeText}>{showNewPw ? '\uD83D\uDE48' : '\uD83D\uDC41'}</Text>
          </Pressable>
        </View>
        <Text style={styles.inputLabel}>Confirma parola noua</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeta parola noua"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          editable={!savingPassword}
          onSubmitEditing={savePassword}
          returnKeyType="done"
        />
        {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
        {!!passwordMessage && <Text style={styles.successText}>{passwordMessage}</Text>}
        <Pressable
          style={[styles.saveSmallButton, savingPassword && styles.disabledButton]}
          onPress={savePassword}
          disabled={savingPassword}
        >
          {savingPassword ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.saveSmallButtonText}>Schimba parola</Text>
          )}
        </Pressable>
        </>
      )}
      </View>

      <View style={styles.card}>
        <Pressable
          style={styles.cardHeader}
          onPress={() => onToggleSection('notifications')}
        >
          <Text style={styles.cardTitle}>Notificari si remindere</Text>
          <Text style={styles.expandIcon}>{notificationsOpen ? '▾' : '▸'}</Text>
        </Pressable>

        {notificationsOpen && (
          <>
            {/* Master toggle */}
        <View style={[styles.switchRow, styles.masterSwitchRow]}>
          <Text style={styles.masterSwitchLabel}>Activeaza toate notificarile</Text>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={toggleAll}
            trackColor={{ true: C.accent }}
          />
        </View>

        <View style={styles.divider} />

        {/* Remindere cadouri */}
        <Text style={styles.notifGroupLabel}>Remindere cadouri</Text>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, !settings.notificationsEnabled && styles.disabledText]}>
            Reminder cumparare cadou
          </Text>
          <Switch
            value={settings.notifyBuyReminder && settings.notificationsEnabled}
            onValueChange={(v) => updateSetting('notifyBuyReminder', v)}
            disabled={!settings.notificationsEnabled}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, !settings.notificationsEnabled && styles.disabledText]}>
            Reminder oferire cadou
          </Text>
          <Switch
            value={settings.notifyOfferReminder && settings.notificationsEnabled}
            onValueChange={(v) => updateSetting('notifyOfferReminder', v)}
            disabled={!settings.notificationsEnabled}
          />
        </View>

        <View style={styles.divider} />

        {/* Alerte preturi */}
        <Text style={styles.notifGroupLabel}>Alerte preturi</Text>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, !settings.notificationsEnabled && styles.disabledText]}>
            Pret crescut
          </Text>
          <Switch
            value={settings.notifyPriceUp && settings.notificationsEnabled}
            onValueChange={(v) => updateSetting('notifyPriceUp', v)}
            disabled={!settings.notificationsEnabled}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, !settings.notificationsEnabled && styles.disabledText]}>
            Pret scazut
          </Text>
          <Switch
            value={settings.notifyPriceDown && settings.notificationsEnabled}
            onValueChange={(v) => updateSetting('notifyPriceDown', v)}
            disabled={!settings.notificationsEnabled}
          />
        </View>

        <View style={styles.divider} />

        {/* Zile de nastere */}
        <Text style={styles.notifGroupLabel}>Zile de nastere</Text>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, !settings.notificationsEnabled && styles.disabledText]}>
            Notificare ziua de nastere
          </Text>
          <Switch
            value={settings.notifyBirthdays && settings.notificationsEnabled}
            onValueChange={(v) => updateSetting('notifyBirthdays', v)}
            disabled={!settings.notificationsEnabled}
          />
        </View>

        {!!settingsMessage && <Text style={styles.successText}>{settingsMessage}</Text>}
        <Pressable
          style={[styles.saveSmallButton, savingSettings && styles.disabledButton]}
          onPress={saveSettings}
          disabled={savingSettings}
        >
          {savingSettings ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.saveSmallButtonText}>Salveaza setarile</Text>
          )}
        </Pressable>
          </>
        )}
      </View>

      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutButtonText}>Deconecteaza-te</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
    backgroundColor: C.bg,
  },
  pageTitle: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '400',
    color: C.text,
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    gap: 10,
    ...S.card,
  },
  cardTitle: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '400',
    color: C.text,
    marginBottom: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 8,
  },
  expandIcon: {
    fontSize: 16,
    color: C.textFaint,
  },
  profileRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  avatarWrap: {
    flexShrink: 0,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: 'serif',
    color: C.accent,
    fontSize: 22,
    fontWeight: '500',
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontFamily: 'serif',
    fontSize: 17,
    fontWeight: '400',
    color: C.text,
  },
  profileEmail: {
    fontSize: 13,
    color: C.textDim,
  },
  profileMeta: {
    fontSize: 13,
    color: C.textFaint,
  },
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photoPreviewWrap: {
    flexShrink: 0,
  },
  photoPreview: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  photoPreviewFallback: {
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtonGroup: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  photoButton: {
    flex: 1,
    backgroundColor: C.surface2,
    borderColor: C.border,
    borderWidth: 0.5,
    borderRadius: R.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  photoDeleteButton: {
    backgroundColor: C.dangerBg,
    borderColor: C.border,
  },
  photoButtonHover: {
    backgroundColor: C.accentSoft,
  },
  photoButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  photoButtonText: {
    color: C.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  photoDeleteButtonText: {
    color: C.danger,
  },
  divider: {
    height: 0.5,
    backgroundColor: C.border,
    marginVertical: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textDim,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  inputLabel: {
    color: C.textDim,
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    minHeight: 46,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    color: C.text,
    backgroundColor: C.surface2,
    fontSize: 14,
  },
  flex1: {
    flex: 1,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyeButton: {
    padding: 8,
  },
  eyeText: {
    fontSize: 18,
  },
  hintText: {
    color: C.textFaint,
    fontSize: 12,
  },
  saveSmallButton: {
    backgroundColor: C.accent,
    borderRadius: R.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
  },
  saveSmallButtonText: {
    color: C.accentInk,
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  successText: {
    color: C.sage,
    fontSize: 13,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  masterSwitchRow: {
    paddingVertical: 6,
  },
  masterSwitchLabel: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
  },
  switchLabel: {
    flex: 1,
    color: C.textDim,
    fontSize: 14,
  },
  switchLabelWithBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disabledText: {
    color: C.textFaint,
  },
  notifGroupLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
    marginBottom: 2,
  },
  reminderDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 4,
    marginTop: -4,
    marginBottom: 4,
  },
  daysInput: {
    width: 60,
    height: 38,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.sm,
    paddingHorizontal: 10,
    color: C.text,
    backgroundColor: C.surface2,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  daysLabel: {
    color: C.textDim,
    fontSize: 13,
  },
  priceTag: {
    borderRadius: R.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priceTagUp: {
    backgroundColor: C.dangerBg,
  },
  priceTagDown: {
    backgroundColor: C.sageBg,
  },
  priceTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: C.textDim,
  },
  logoutButton: {
    backgroundColor: C.surface2,
    paddingVertical: 14,
    borderRadius: R.xl,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.border,
  },
  logoutButtonText: {
    color: C.textDim,
    fontWeight: '600',
    fontSize: 15,
  },
});
