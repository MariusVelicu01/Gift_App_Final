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
        <Text style={styles.title}>🎁 Acasa</Text>
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
    backgroundColor: '#fff7ed',
  },
  headerCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fce7e0',
    borderTopWidth: 4,
    borderTopColor: '#f59e0b',
  },
  kicker: {
    color: '#be123c',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#111827',
  },
  subtitle: {
    color: '#4b5563',
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fce7e0',
  },
  metricValue: {
    color: '#be123c',
    fontSize: 28,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fce7e0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
    color: '#111827',
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#fce7e0',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  pressedRow: {
    backgroundColor: '#f8fafc',
  },
  infoTextBlock: {
    flex: 1,
  },
  infoTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  heroBanner: {
    height: 120,
    backgroundColor: '#fff1f2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fce7e0',
    marginBottom: 8,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fce7e0',
    marginBottom: 8,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 34,
    fontWeight: '900',
    color: '#be123c',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#374151',
    marginTop: 8,
  },
  infoMeta: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  warningValue: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '900',
  },
  successValue: {
    color: '#16a34a',
    fontSize: 15,
    fontWeight: '900',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '900',
  },
});
