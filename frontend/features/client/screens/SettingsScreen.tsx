import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useAuth } from '../../../context/AuthContext';
import { clearCalendarCache } from '../../../services/calendarCache';

const CLIENT_SETTINGS_KEY = 'gift_app_client_settings';

type ClientSettings = {
  notificationsEnabled: boolean;
  buyReminderDays: string;
  offerReminderDays: string;
  defaultBudget: string;
  defaultCurrency: string;
  calendarShowBuy: boolean;
  calendarShowOffer: boolean;
  calendarShowCompleted: boolean;
  aiDefaultProductCount: string;
  aiKeepProductsByDefault: boolean;
};

const DEFAULT_SETTINGS: ClientSettings = {
  notificationsEnabled: true,
  buyReminderDays: '7',
  offerReminderDays: '2',
  defaultBudget: '200',
  defaultCurrency: 'RON',
  calendarShowBuy: true,
  calendarShowOffer: true,
  calendarShowCompleted: true,
  aiDefaultProductCount: '1',
  aiKeepProductsByDefault: true,
};

const CURRENCY_OPTIONS = [
  { label: 'RON', value: 'RON' },
  { label: 'EUR', value: 'EUR' },
  { label: 'USD', value: 'USD' },
];

function normalizeNumericInput(value: string) {
  return value.replace(/[^0-9]/g, '');
}

export default function SettingsScreen({ onLogout }: { onLogout: () => void }) {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<ClientSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(CLIENT_SETTINGS_KEY);

      if (!savedSettings) return;

      setSettings({
        ...DEFAULT_SETTINGS,
        ...JSON.parse(savedSettings),
      });
    } catch (error) {
      console.error('LOAD CLIENT SETTINGS ERROR:', error);
    }
  };

  const updateSetting = <Key extends keyof ClientSettings>(
    key: Key,
    value: ClientSettings[Key]
  ) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
    setMessage('');
  };

  const validateSettings = () => {
    const defaultBudget = Number(settings.defaultBudget);
    const buyReminderDays = Number(settings.buyReminderDays);
    const offerReminderDays = Number(settings.offerReminderDays);
    const aiDefaultProductCount = Number(settings.aiDefaultProductCount);

    if (!Number.isFinite(defaultBudget) || defaultBudget <= 0) {
      return 'Bugetul implicit trebuie sa fie mai mare decat 0.';
    }

    if (!Number.isInteger(buyReminderDays) || buyReminderDays < 0) {
      return 'Reminder-ul pentru cumparare trebuie sa fie 0 sau mai mare.';
    }

    if (!Number.isInteger(offerReminderDays) || offerReminderDays < 0) {
      return 'Reminder-ul pentru oferire trebuie sa fie 0 sau mai mare.';
    }

    if (!Number.isInteger(aiDefaultProductCount) || aiDefaultProductCount < 1) {
      return 'Numarul implicit de produse pentru AI trebuie sa fie cel putin 1.';
    }

    return '';
  };

  const saveSettings = async () => {
    const validationError = validateSettings();

    if (validationError) {
      setMessage(validationError);
      return;
    }

    try {
      setSaving(true);
      await AsyncStorage.setItem(CLIENT_SETTINGS_KEY, JSON.stringify(settings));
      setMessage('Setarile au fost salvate.');
    } catch (error) {
      console.error('SAVE CLIENT SETTINGS ERROR:', error);
      setMessage('Nu am putut salva setarile.');
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    try {
      setSettings(DEFAULT_SETTINGS);
      await AsyncStorage.setItem(
        CLIENT_SETTINGS_KEY,
        JSON.stringify(DEFAULT_SETTINGS)
      );
      setMessage('Setarile au fost resetate.');
    } catch (error) {
      console.error('RESET CLIENT SETTINGS ERROR:', error);
      setMessage('Nu am putut reseta setarile.');
    }
  };

  const clearLocalCache = () => {
    clearCalendarCache();
    setMessage('Cache-ul calendarului a fost curatat.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>⚙️ Setari</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>👤 Cont</Text>
        <Text style={styles.cardText}>
          {profile
            ? `${profile.firstName} ${profile.lastName} - ${profile.email}`
            : 'Esti conectat in aplicatie.'}
        </Text>
        <Text style={styles.metaText}>
          Rol: {profile?.role === 'admin' ? 'Administrator' : 'Client'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔔 Notificari si remindere</Text>
        <SettingSwitch
          label="Activeaza remindere pentru cadouri"
          value={settings.notificationsEnabled}
          onValueChange={(value) => updateSetting('notificationsEnabled', value)}
        />

        <View style={styles.inputGrid}>
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Reminder cumparare</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={settings.buyReminderDays}
              onChangeText={(value) =>
                updateSetting('buyReminderDays', normalizeNumericInput(value))
              }
              placeholder="Ex: 7"
            />
            <Text style={styles.hintText}>zile inainte de deadline</Text>
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Reminder oferire</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={settings.offerReminderDays}
              onChangeText={(value) =>
                updateSetting('offerReminderDays', normalizeNumericInput(value))
              }
              placeholder="Ex: 2"
            />
            <Text style={styles.hintText}>zile inainte de ziua cadoului</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎁 Cadouri si buget</Text>
        <View style={styles.inputGrid}>
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Buget implicit</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={settings.defaultBudget}
              onChangeText={(value) =>
                updateSetting('defaultBudget', normalizeNumericInput(value))
              }
              placeholder="Ex: 200"
            />
          </View>

          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Moneda preferata</Text>
            <Dropdown
              style={styles.dropdown}
              containerStyle={styles.dropdownContainer}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              data={CURRENCY_OPTIONS}
              maxHeight={180}
              labelField="label"
              valueField="value"
              value={settings.defaultCurrency}
              onChange={(item) => updateSetting('defaultCurrency', item.value)}
            />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📅 Calendar</Text>
        <Text style={styles.cardText}>
          Alege ce tipuri de evenimente vrei sa fie bifate implicit in calendar.
        </Text>
        <SettingSwitch
          label="Cadouri - de cumparat"
          value={settings.calendarShowBuy}
          onValueChange={(value) => updateSetting('calendarShowBuy', value)}
        />
        <SettingSwitch
          label="Cadouri - de oferit"
          value={settings.calendarShowOffer}
          onValueChange={(value) => updateSetting('calendarShowOffer', value)}
        />
        <SettingSwitch
          label="Cadouri - finalizate"
          value={settings.calendarShowCompleted}
          onValueChange={(value) =>
            updateSetting('calendarShowCompleted', value)
          }
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🤖 Ajutor AI</Text>
        <View style={styles.inputBlock}>
          <Text style={styles.inputLabel}>Numar implicit de produse sugerate</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={settings.aiDefaultProductCount}
            onChangeText={(value) =>
              updateSetting('aiDefaultProductCount', normalizeNumericInput(value))
            }
            placeholder="Ex: 1"
          />
        </View>
        <SettingSwitch
          label="Pastreaza produsele deja adaugate cand cer ajutor AI"
          value={settings.aiKeepProductsByDefault}
          onValueChange={(value) =>
            updateSetting('aiKeepProductsByDefault', value)
          }
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🧹 Date locale</Text>
        <Text style={styles.cardText}>
          Poti curata datele temporare salvate local, fara sa stergi cadourile
          sau magazinele din baza de date.
        </Text>
        <Pressable style={styles.secondaryButton} onPress={clearLocalCache}>
          <Text style={styles.secondaryButtonText}>Curata cache calendar</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={resetSettings}>
          <Text style={styles.secondaryButtonText}>Reseteaza setarile</Text>
        </Pressable>
      </View>

      {!!message && (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      <Pressable
        style={[styles.saveButton, saving && styles.disabledButton]}
        onPress={saveSettings}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Se salveaza...' : 'Salveaza setarile'}
        </Text>
      </Pressable>

      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

function SettingSwitch({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
    backgroundColor: '#fff7ed',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#be123c',
    marginBottom: 2,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fce7e0',
    shadowColor: '#be123c',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#111827',
  },
  cardText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#9ca3af',
    marginBottom: 12,
  },
  metaText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  inputGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  inputBlock: {
    flex: 1,
    minWidth: 0,
    marginBottom: 10,
  },
  inputLabel: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#111827',
    backgroundColor: '#fafafa',
    fontSize: 14,
  },
  hintText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 5,
  },
  dropdown: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
  },
  dropdownContainer: {
    borderRadius: 10,
    borderColor: '#e5e7eb',
  },
  dropdownPlaceholder: {
    color: '#9ca3af',
    fontSize: 14,
  },
  dropdownSelectedText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  switchRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f9f1ee',
    paddingVertical: 8,
  },
  switchLabel: {
    flex: 1,
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f9f1ee',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fce7e0',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#be123c',
    fontWeight: '700',
    fontSize: 14,
  },
  messageBox: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 14,
  },
  messageText: {
    color: '#15803d',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#be123c',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  logoutButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  logoutButtonText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
