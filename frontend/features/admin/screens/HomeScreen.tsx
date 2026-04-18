import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { C, R, S } from '../../../constants/theme';
import {
  getAdminPartnerStoresCache,
  subscribeAdminPartnerStoresCache,
} from '../../../services/adminPartnerStoresCache';
import { PartnerStore } from '../../../types/partnerStores';

type Props = {
  firstName: string;
  onOpenStore: (storeId: string) => void;
};

function getTodayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;
}

function daysUntil(dateKey?: string) {
  if (!dateKey) return null;

  const [year, month, day] = dateKey.split('-').map(Number);
  const target = new Date(year, month - 1, day);

  if (Number.isNaN(target.getTime())) return null;

  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function formatDate(value?: string) {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

export default function HomeScreen({ firstName, onOpenStore }: Props) {
  const { token } = useAuth();
  const [stores, setStores] = useState<PartnerStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      if (!token) return;

      setLoading(true);
      setError('');

      const storesResult = await getAdminPartnerStoresCache(token);
      setStores(storesResult);
    } catch (err: any) {
      setError(err?.message || 'Nu am putut incarca datele de administrare.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    if (!token) return;

    const unsubscribe = subscribeAdminPartnerStoresCache(loadDashboard);
    return unsubscribe;
  }, [token]);

  const dashboardStats = useMemo(() => {
    const todayKey = getTodayKey();
    const activeContracts = stores.filter(
      (store) => store.contractEndDate >= todayKey
    );
    const expiringContracts = stores
      .map((store) => ({ store, days: daysUntil(store.contractEndDate) }))
      .filter((entry) => entry.days !== null && entry.days >= 0 && entry.days <= 180)
      .sort((a, b) => Number(a.days) - Number(b.days));

    return {
      partnerStores: stores.length,
      activeContracts: activeContracts.length,
      expiringContracts,
    };
  }, [stores]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroBanner} />

      <View>
        <Text style={styles.title}>Acasa</Text>
        <Text style={styles.subtitle}>Bun venit, {firstName}.</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>{dashboardStats.partnerStores}</Text>
        <Text style={styles.summaryLabel}>Magazine partenere</Text>
      </View>

      <View style={styles.headerCard}>
        <Text style={styles.kicker}>Panou administrator</Text>
        <Text style={styles.subtitle}>
          Ai o privire rapida asupra magazinelor partenere si contractelor.
        </Text>
      </View>

      {loading ? (
        <View style={styles.card}>
          <ActivityIndicator />
          <Text style={styles.cardText}>Se incarca dashboard-ul...</Text>
        </View>
      ) : error ? (
        <View style={styles.card}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          <View style={styles.statsGrid}>
            <MetricCard label="Magazine partenere" value={dashboardStats.partnerStores} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Magazine partenere</Text>
            {stores.length === 0 ? (
              <Text style={styles.cardText}>
                Nu exista magazine partenere in sistem.
              </Text>
            ) : (
              stores.map((store) => (
                <Pressable
                  key={store.id}
                  onPress={() => onOpenStore(store.id)}
                  style={({ pressed }) => [
                    styles.infoRow,
                    pressed && styles.pressedRow,
                  ]}
                >
                  <View style={styles.infoTextBlock}>
                    <Text style={styles.infoTitle}>{store.displayName}</Text>
                    <Text style={styles.infoMeta}>
                      Contract: {formatDate(store.contractStartDate)} - {formatDate(store.contractEndDate)}
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contracte aproape de final</Text>
            {dashboardStats.expiringContracts.length === 0 ? (
              <Text style={styles.cardText}>
                Nu exista contracte care expira in urmatoarele 6 luni.
              </Text>
            ) : (
              dashboardStats.expiringContracts.map(({ store, days }) => (
                <View key={store.id} style={styles.infoRow}>
                  <View style={styles.infoTextBlock}>
                    <Text style={styles.infoTitle}>{store.displayName}</Text>
                    <Text style={styles.infoMeta}>
                      Contract pana la {formatDate(store.contractEndDate)}
                    </Text>
                  </View>
                  <Text style={styles.warningValue}>{days} zile</Text>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
  headerCard: {
    backgroundColor: C.surface,
    padding: 18,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    borderTopWidth: 3,
    borderTopColor: C.warn,
    ...S.card,
  },
  kicker: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    fontFamily: 'serif',
    fontWeight: '400',
    color: C.text,
  },
  subtitle: {
    color: C.textDim,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 190,
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    ...S.card,
  },
  metricValue: {
    color: C.accent,
    fontSize: 28,
    fontFamily: 'serif',
    fontWeight: '400',
  },
  metricLabel: {
    color: C.textDim,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  card: {
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    ...S.card,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
    color: C.text,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: C.textDim,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  pressedRow: {
    backgroundColor: C.surface2,
  },
  infoTextBlock: {
    flex: 1,
  },
  infoTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
  },
  heroBanner: {
    height: 120,
    backgroundColor: C.accentSoft,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    marginBottom: 8,
  },
  summaryCard: {
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    marginBottom: 8,
    alignItems: 'center',
    ...S.card,
  },
  summaryValue: {
    fontSize: 34,
    fontFamily: 'serif',
    fontWeight: '400',
    color: C.accent,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginTop: 8,
  },
  infoMeta: {
    color: C.textDim,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  warningValue: {
    color: C.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  successValue: {
    color: C.sage,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: C.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});
