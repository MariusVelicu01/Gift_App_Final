import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { changePasswordRequest, updateProfileRequest } from '../../../services/authApi';
import { C, R, S } from '../../../constants/theme';

type Props = {
  onLogout: () => Promise<void> | void;
};

const PROFILE_PHOTO_KEY_PREFIX = 'gift_app_admin_profile_photo_';

function getProfilePhotoKey(uid?: string) {
  return `${PROFILE_PHOTO_KEY_PREFIX}${uid ?? 'default'}`;
}

function formatBirthDate(birthDate?: string) {
  if (!birthDate) return '-';

  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return '-';

  return `${String(date.getDate()).padStart(2, '0')}.${String(
    date.getMonth() + 1
  ).padStart(2, '0')}.${date.getFullYear()}`;
}

function getGenderLabel(gender?: string) {
  if (gender === 'male') return 'Masculin';
  if (gender === 'female') return 'Feminin';
  return 'Nespecificat';
}

export default function SettingsScreen({ onLogout }: Props) {
  const { profile, token, refreshProfile } = useAuth();
  const [personalDataOpen, setPersonalDataOpen] = useState(false);
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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const initials = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';
  const fullName = profile
    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
    : '-';

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!profile?.uid) {
      setPhotoUri(null);
      return;
    }

    loadPhoto(profile.uid);
  }, [profile?.uid]);

  const loadPhoto = async (uid: string) => {
    try {
      const saved = await AsyncStorage.getItem(getProfilePhotoKey(uid));
      setPhotoUri(saved || null);
    } catch {
      setPhotoUri(null);
    }
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
      console.error('REMOVE ADMIN PROFILE PHOTO ERROR:', error);
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
    } catch (error: any) {
      setNameError(error?.message || 'Nu am putut actualiza numele.');
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
    } catch (error: any) {
      setPasswordError(error?.message || 'Nu am putut schimba parola.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Setari admin</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cont administrator</Text>
        <View style={styles.profileRow}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{fullName || '-'}</Text>
            <Text style={styles.profileEmail}>{profile?.email ?? '-'}</Text>
            <Text style={styles.profileMeta}>
              Data nasterii: {formatBirthDate(profile?.birthDate)}
            </Text>
            <Text style={styles.profileMeta}>Gen: {getGenderLabel(profile?.gender)}</Text>
            <Text style={styles.profileMeta}>Rol: Administrator</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Pressable
          style={styles.cardHeader}
          onPress={() => setPersonalDataOpen((current) => !current)}
        >
          <Text style={styles.cardTitle}>Date personale</Text>
          <Text style={styles.expandIcon}>{personalDataOpen ? 'v' : '>'}</Text>
        </Pressable>

        {personalDataOpen && (
          <>
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

            <Text style={styles.sectionLabel}>Modifica numele</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>Prenume</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Prenume"
                  placeholderTextColor={C.textFaint}
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
                  placeholderTextColor={C.textFaint}
                  editable={!savingName}
                />
              </View>
            </View>
            {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}
            {!!nameMessage && <Text style={styles.successText}>{nameMessage}</Text>}
            <Pressable
              style={[styles.saveButton, savingName && styles.disabledButton]}
              onPress={saveName}
              disabled={savingName}
            >
              {savingName ? (
                <ActivityIndicator color={C.accentInk} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Salveaza numele</Text>
              )}
            </Pressable>

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>Schimba parola</Text>
            <PasswordField
              label="Parola curenta"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Parola curenta"
              visible={showCurrentPassword}
              onToggleVisible={() => setShowCurrentPassword((current) => !current)}
              editable={!savingPassword}
            />

            <PasswordField
              label="Parola noua"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Parola noua (min. 6 caractere)"
              visible={showNewPassword}
              onToggleVisible={() => setShowNewPassword((current) => !current)}
              editable={!savingPassword}
            />

            <PasswordField
              label="Confirma parola noua"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeta parola noua"
              visible={showConfirmPassword}
              onToggleVisible={() => setShowConfirmPassword((current) => !current)}
              editable={!savingPassword}
              onSubmitEditing={savePassword}
            />

            {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
            {!!passwordMessage && <Text style={styles.successText}>{passwordMessage}</Text>}

            <Pressable
              style={[styles.saveButton, savingPassword && styles.disabledButton]}
              onPress={savePassword}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <ActivityIndicator color={C.accentInk} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Salveaza parola</Text>
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

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  visible,
  onToggleVisible,
  editable,
  onSubmitEditing,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  visible: boolean;
  onToggleVisible: () => void;
  editable: boolean;
  onSubmitEditing?: () => void;
}) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.input, styles.flex1]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textFaint}
          secureTextEntry={!visible}
          editable={editable}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={onSubmitEditing ? 'done' : 'next'}
        />
        <Pressable style={styles.revealButton} onPress={onToggleVisible}>
          <Text style={styles.revealButtonText}>{visible ? 'Ascunde' : 'Arata'}</Text>
        </Pressable>
      </View>
    </View>
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
    fontWeight: '700',
  },
  profileRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  revealButton: {
    minHeight: 46,
    borderRadius: R.md,
    borderWidth: 0.5,
    borderColor: C.border,
    backgroundColor: C.surface2,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealButtonText: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: C.accent,
    borderRadius: R.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
  },
  saveButtonText: {
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
