import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../services/config';

type Props = {
  onLogout: () => Promise<void> | void;
};

type AdminSettingKey =
  | 'confirmImports'
  | 'compactStats'
  | 'showOperationalHints'
  | 'highlightManualDemand';

const SETTINGS_STORAGE_KEY = 'gift_app_admin_settings';

const DEFAULT_SETTINGS: Record<AdminSettingKey, boolean> = {
  confirmImports: true,
  compactStats: false,
  showOperationalHints: true,
  highlightManualDemand: true,
};

export default function SettingsScreen({ onLogout }: Props) {
  const { profile } = useAuth();
  const [settings, setSettings] =
    useState<Record<AdminSettingKey, boolean>>(DEFAULT_SETTINGS);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

        if (saved) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...JSON.parse(saved),
          });
        }
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    };

    loadSettings();
  }, []);

  const toggleSetting = async (key: AdminSettingKey) => {
    const nextSettings = {
      ...settings,
      [key]: !settings[key],
    };

    setSettings(nextSettings);
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Setari admin</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cont administrator</Text>
        <InfoRow label="Nume" value={`${profile?.firstName || ''} ${profile?.lastName || ''}`} />
        <InfoRow label="Email" value={profile?.email || '-'} />
        <InfoRow label="Rol" value={profile?.role || 'admin'} />
        <InfoRow
          label="Gen"
          value={
            profile?.gender === 'male'
              ? 'Masculin'
              : profile?.gender === 'female'
              ? 'Feminin'
              : 'Nespecificat'
          }
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Preferinte dashboard</Text>
        <ToggleRow
          label="Confirmare inainte de importuri"
          description="Util pentru fisiere mari sau actualizari de catalog."
          value={settings.confirmImports}
          onPress={() => toggleSetting('confirmImports')}
        />
        <ToggleRow
          label="Statistici in format compact"
          description="Pastreaza mai multe carduri vizibile pe ecrane mici."
          value={settings.compactStats}
          onPress={() => toggleSetting('compactStats')}
        />
        <ToggleRow
          label="Sugestii operationale"
          description="Afiseaza indicii despre contracte, cereri manuale si importuri."
          value={settings.showOperationalHints}
          onPress={() => toggleSetting('showOperationalHints')}
        />
        <ToggleRow
          label="Evidentiaza cererea manuala"
          description="Ajuta la observarea produselor pe care userii nu le gasesc."
          value={settings.highlightManualDemand}
          onPress={() => toggleSetting('highlightManualDemand')}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Conexiune si date</Text>
        <InfoRow label="Backend API" value={API_BASE_URL} />
        <InfoRow label="Persistenta" value="Firebase + AsyncStorage local" />
        <InfoRow label="Import produse" value="JSON sau XML pe web" />
        <InfoRow label="Linkuri afiliere" value="Prioritare la deschiderea produselor" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Zone de administrare</Text>
        <Text style={styles.cardText}>
          Magazine: adaugare parteneri, import cataloage, istoric preturi si folosire
          produse.
        </Text>
        <Text style={styles.cardText}>
          Statistici: activitate useri, performanta magazinelor si cerere de produse.
        </Text>
        <Text style={styles.cardText}>
          Home: monitorizare rapida pentru contracte, produse si importuri recente.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sesiune</Text>

        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onPress,
}: {
  label: string;
  description: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.toggleRow} onPress={onPress}>
      <View style={styles.toggleTextBlock}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <View style={[styles.togglePill, value && styles.togglePillActive]}>
        <Text style={[styles.togglePillText, value && styles.togglePillTextActive]}>
          {value ? 'ON' : 'OFF'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
    backgroundColor: '#fff7ed',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#be123c',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fce7e0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
    color: '#111827',
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
    marginBottom: 12,
  },
  infoRow: {
    borderTopWidth: 1,
    borderTopColor: '#fce7e0',
    paddingVertical: 11,
  },
  infoLabel: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },
  infoValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  toggleRow: {
    borderTopWidth: 1,
    borderTopColor: '#fce7e0',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleTextBlock: {
    flex: 1,
  },
  toggleLabel: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  toggleDescription: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  togglePill: {
    minWidth: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  togglePillActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  togglePillText: {
    color: '#6b7280',
    fontWeight: '900',
    fontSize: 12,
  },
  togglePillTextActive: {
    color: '#fff',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
