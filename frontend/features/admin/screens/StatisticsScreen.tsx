import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useAuth } from '../../../context/AuthContext';
import {
  AdminUserStatisticsGiftPlan,
  getAdminUserStatistics,
} from '../../../services/adminStatisticsApi';

type GenderFilter = 'male' | 'female';
type StatsView = 'overview' | 'users' | 'stores' | 'productDemand';
type ProductDemandFilter = 'added' | 'purchased';

type TopEntry = {
  label: string;
  count: number;
  hint?: string;
};

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return '-';
  return `${Math.round(value)} RON`;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return '-';
  return Number(value.toFixed(1));
}

function getAverage(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function addCount(map: Map<string, TopEntry>, label: string, hint?: string) {
  const normalizedLabel = label.trim();
  if (!normalizedLabel) return;

  const existing = map.get(normalizedLabel);

  map.set(normalizedLabel, {
    label: normalizedLabel,
    count: (existing?.count || 0) + 1,
    hint: existing?.hint || hint,
  });
}

function toTopEntries(map: Map<string, TopEntry>, limit?: number) {
  const entries = Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });

  return limit ? entries.slice(0, limit) : entries;
}

export default function StatisticsScreen() {
  const { token } = useAuth();
  const [view, setView] = useState<StatsView>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [giftPlans, setGiftPlans] = useState<AdminUserStatisticsGiftPlan[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [purposes, setPurposes] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedPurpose, setSelectedPurpose] = useState('all');
  const [selectedGenders, setSelectedGenders] = useState<GenderFilter[]>([
    'male',
    'female',
  ]);
  const [productDemandSearch, setProductDemandSearch] = useState('');
  const [productDemandFilter, setProductDemandFilter] =
    useState<ProductDemandFilter>('added');

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        if (!token) return;
        setLoading(true);
        setError('');
        const data = await getAdminUserStatistics(token);
        setGiftPlans(data.giftPlans || []);
        setYears(data.years || []);
        setPurposes(data.purposes || []);
      } catch (err: any) {
        setError(err?.message || 'Nu am putut incarca statisticile.');
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, [token]);

  const yearOptions = useMemo(
    () => [
      { label: 'Toti anii', value: 'all' },
      ...years.map((year) => ({ label: String(year), value: String(year) })),
    ],
    [years]
  );

  const purposeOptions = useMemo(
    () => [
      { label: 'Toate scopurile', value: 'all' },
      ...purposes.map((purpose) => ({ label: purpose, value: purpose })),
    ],
    [purposes]
  );

  const filteredGiftPlans = useMemo(() => {
    return giftPlans.filter((giftPlan) => {
      const matchesYear =
        selectedYear === 'all' || String(giftPlan.year) === selectedYear;
      const matchesPurpose =
        selectedPurpose === 'all' || giftPlan.purpose === selectedPurpose;
      const matchesGender =
        selectedGenders.length === 0
          ? false
          : selectedGenders.includes(giftPlan.userGender as GenderFilter);

      return matchesYear && matchesPurpose && matchesGender;
    });
  }, [giftPlans, selectedGenders, selectedPurpose, selectedYear]);

  const stats = useMemo(() => {
    const budgets = filteredGiftPlans
      .map((giftPlan) => giftPlan.budget)
      .filter((value) => Number.isFinite(value));
    const purchasedGiftPlans = filteredGiftPlans.filter(
      (giftPlan) => giftPlan.purchasedOnTime !== null
    );
    const daysToPurchase = purchasedGiftPlans
      .map((giftPlan) => giftPlan.daysToPurchase)
      .filter((value): value is number => value !== null && Number.isFinite(value));
    const delays = purchasedGiftPlans
      .map((giftPlan) => giftPlan.delayDays)
      .filter((value): value is number => value !== null && Number.isFinite(value));
    const onTimeCount = purchasedGiftPlans.filter(
      (giftPlan) => giftPlan.purchasedOnTime === true
    ).length;
    const lateCount = purchasedGiftPlans.filter(
      (giftPlan) => giftPlan.purchasedOnTime === false
    ).length;
    const totalPurchased = onTimeCount + lateCount;
    const selectedProducts = filteredGiftPlans.flatMap(
      (giftPlan) => giftPlan.selectedProducts || []
    );
    const purchasedProducts = selectedProducts.filter((product) => product.isPurchased);
    const purchasedCheapestProducts = purchasedProducts.filter(
      (product) => product.selectedAsCheapestOffer
    );
    const manualSearchFallbackProducts = selectedProducts.filter(
      (product) => product.manualSearchFallback || product.storeId === 'manual'
    );

    return {
      totalGiftPlans: filteredGiftPlans.length,
      purchasedCount: totalPurchased,
      averageBudget: getAverage(budgets),
      maxBudget: budgets.length ? Math.max(...budgets) : 0,
      minBudget: budgets.length ? Math.min(...budgets) : 0,
      averageDaysToPurchase: getAverage(daysToPurchase),
      averageDelayDays: getAverage(delays),
      onTimePercent: totalPurchased ? (onTimeCount / totalPurchased) * 100 : 0,
      latePercent: totalPurchased ? (lateCount / totalPurchased) * 100 : 0,
      onTimeCount,
      lateCount,
      selectedProductsCount: selectedProducts.length,
      purchasedProductsCount: purchasedProducts.length,
      purchasedCheapestProductsCount: purchasedCheapestProducts.length,
      purchasedCheapestProductsPercent: purchasedProducts.length
        ? (purchasedCheapestProducts.length / purchasedProducts.length) * 100
        : 0,
      manualSearchFallbackProductsCount: manualSearchFallbackProducts.length,
      manualSearchFallbackProductsPercent: selectedProducts.length
        ? (manualSearchFallbackProducts.length / selectedProducts.length) * 100
        : 0,
    };
  }, [filteredGiftPlans]);

  const storeStats = useMemo(() => {
    const selectedProducts = filteredGiftPlans.flatMap(
      (giftPlan) => giftPlan.selectedProducts || []
    );
    const listedStoreMap = new Map<string, TopEntry>();
    const purchasedStoreMap = new Map<string, TopEntry>();
    const purchasedCategoryMap = new Map<string, TopEntry>();
    const purchasedProductMap = new Map<string, TopEntry>();
    const productDemandAddedMap = new Map<string, TopEntry>();
    const productDemandPurchasedMap = new Map<string, TopEntry>();
    const purchasedProducts = selectedProducts.filter((product) => product.isPurchased);

    selectedProducts.forEach((product) => {
      if (product.storeId !== 'manual') {
        addCount(listedStoreMap, product.storeName || 'Magazin necunoscut');
      }

      if (product.manualSearchFallback || product.storeId === 'manual') {
        addCount(productDemandAddedMap, product.name || 'Produs fara nume');

        if (product.isPurchased) {
          addCount(productDemandPurchasedMap, product.name || 'Produs fara nume');
        }
      }
    });

    purchasedProducts.forEach((product) => {
      const storeName =
        product.purchasedStoreName || product.storeName || 'Magazin necunoscut';
      const category =
        product.category && product.category !== 'Manual'
          ? product.category
          : 'Adaugate manual';
      const productName = product.brand
        ? `${product.name} - ${product.brand}`
        : product.name || 'Produs fara nume';

      addCount(purchasedStoreMap, storeName);
      addCount(purchasedCategoryMap, category);
      addCount(purchasedProductMap, productName, product.category || undefined);
    });

    return {
      listedProductsCount: selectedProducts.length,
      purchasedProductsCount: purchasedProducts.length,
      purchasedCategories: toTopEntries(purchasedCategoryMap),
      listedStores: toTopEntries(listedStoreMap),
      purchasedStores: toTopEntries(purchasedStoreMap),
      topPurchasedProducts: toTopEntries(purchasedProductMap, 3),
      productDemandAdded: toTopEntries(productDemandAddedMap),
      productDemandPurchased: toTopEntries(productDemandPurchasedMap),
    };
  }, [filteredGiftPlans]);

  const productDemandEntries = useMemo(() => {
    const normalizedSearch = productDemandSearch.trim().toLowerCase();
    const source =
      productDemandFilter === 'purchased'
        ? storeStats.productDemandPurchased
        : storeStats.productDemandAdded;

    return source.filter((entry) =>
      normalizedSearch
        ? entry.label.toLowerCase().includes(normalizedSearch)
        : true
    );
  }, [
    productDemandFilter,
    productDemandSearch,
    storeStats.productDemandAdded,
    storeStats.productDemandPurchased,
  ]);

  const toggleGender = (gender: GenderFilter) => {
    setSelectedGenders((current) =>
      current.includes(gender)
        ? current.filter((item) => item !== gender)
        : [...current, gender]
    );
  };

  if (view === 'users' || view === 'stores' || view === 'productDemand') {
    const isStoreView = view === 'stores';
    const isProductDemandView = view === 'productDemand';

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.secondaryButton} onPress={() => setView('overview')}>
          <Text style={styles.secondaryButtonText}>Inapoi la statistici</Text>
        </Pressable>

        <Text style={styles.title}>
          {isProductDemandView
            ? 'Cerere de produse'
            : isStoreView
            ? 'Statistici magazine'
            : 'Statistici useri'}
        </Text>

        <View style={styles.filtersCard}>
          <Dropdown
            style={styles.dropdown}
            containerStyle={styles.dropdownContainer}
            placeholderStyle={styles.dropdownPlaceholder}
            selectedTextStyle={styles.dropdownSelectedText}
            data={yearOptions}
            maxHeight={260}
            labelField="label"
            valueField="value"
            placeholder="An"
            value={selectedYear}
            onChange={(item) => setSelectedYear(item.value)}
          />

          <Dropdown
            style={styles.dropdown}
            containerStyle={styles.dropdownContainer}
            placeholderStyle={styles.dropdownPlaceholder}
            selectedTextStyle={styles.dropdownSelectedText}
            data={purposeOptions}
            maxHeight={260}
            labelField="label"
            valueField="value"
            placeholder="Scop cadou"
            value={selectedPurpose}
            onChange={(item) => setSelectedPurpose(item.value)}
          />

          <View style={styles.checkboxRow}>
            <Pressable
              style={[
                styles.checkboxButton,
                selectedGenders.includes('male') && styles.checkboxButtonActive,
              ]}
              onPress={() => toggleGender('male')}
            >
              <Text
                style={[
                  styles.checkboxText,
                  selectedGenders.includes('male') && styles.checkboxTextActive,
                ]}
              >
                {selectedGenders.includes('male') ? '✓ ' : ''}Masculin
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.checkboxButton,
                selectedGenders.includes('female') && styles.checkboxButtonActive,
              ]}
              onPress={() => toggleGender('female')}
            >
              <Text
                style={[
                  styles.checkboxText,
                  selectedGenders.includes('female') && styles.checkboxTextActive,
                ]}
              >
                {selectedGenders.includes('female') ? '✓ ' : ''}Feminin
              </Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.card}>
            <ActivityIndicator />
            <Text style={styles.cardText}>Se incarca statisticile...</Text>
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : isProductDemandView ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cerere de produse</Text>
            <Text style={styles.cardText}>
              Produse introduse manual de useri atunci cand nu le-au gasit in
              cautari, grupate dupa nume.
            </Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Cauta in cereri dupa numele produsului"
              value={productDemandSearch}
              onChangeText={setProductDemandSearch}
            />

            <View style={styles.segmentedRow}>
              <Pressable
                style={[
                  styles.segmentedButton,
                  productDemandFilter === 'added' && styles.segmentedButtonActive,
                ]}
                onPress={() => setProductDemandFilter('added')}
              >
                <Text
                  style={[
                    styles.segmentedButtonText,
                    productDemandFilter === 'added' &&
                      styles.segmentedButtonTextActive,
                  ]}
                >
                  Adaugate
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.segmentedButton,
                  productDemandFilter === 'purchased' &&
                    styles.segmentedButtonActive,
                ]}
                onPress={() => setProductDemandFilter('purchased')}
              >
                <Text
                  style={[
                    styles.segmentedButtonText,
                    productDemandFilter === 'purchased' &&
                      styles.segmentedButtonTextActive,
                  ]}
                >
                  Cumparate
                </Text>
              </Pressable>
            </View>

            {productDemandEntries.length === 0 ? (
              <Text style={styles.cardText}>
                Nu exista cereri pentru filtrele selectate.
              </Text>
            ) : (
              productDemandEntries.map((entry, index) => (
                <View key={`${entry.label}-${index}`} style={styles.topRow}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>{index + 1}</Text>
                  </View>
                  <View style={styles.topInfo}>
                    <Text style={styles.topLabel}>{entry.label}</Text>
                  </View>
                  <Text style={styles.topCount}>{entry.count}</Text>
                </View>
              ))
            )}
          </View>
        ) : isStoreView ? (
          <>
            <View style={styles.statsGrid}>
              <MetricCard
                label="Produse adaugate in liste"
                value={String(storeStats.listedProductsCount)}
              />
              <MetricCard
                label="Produse cumparate"
                value={String(storeStats.purchasedProductsCount)}
                tone="success"
              />
              <MetricCard
                label="Categorii cumparate"
                value={String(storeStats.purchasedCategories.length)}
              />
              <MetricCard
                label="Magazine cu produse in liste"
                value={String(storeStats.listedStores.length)}
              />
            </View>

            <TopListCard
              title="Categorii de produse cumparate"
              emptyText="Nu exista produse cumparate pentru filtrele selectate."
              entries={storeStats.purchasedCategories}
            />

            <TopListCard
              title="Cele mai cautate magazine in liste"
              emptyText="Nu exista magazine in liste pentru filtrele selectate."
              entries={storeStats.listedStores}
            />

            <TopListCard
              title="Cele mai cautate magazine cumparate"
              emptyText="Nu exista produse cumparate pentru filtrele selectate."
              entries={storeStats.purchasedStores}
              tone="success"
            />

            <TopListCard
              title="Top 3 produse cele mai cumparate"
              emptyText="Nu exista produse cumparate pentru filtrele selectate."
              entries={storeStats.topPurchasedProducts}
              tone="success"
            />
          </>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <MetricCard
                label="Cadouri in selectie"
                value={String(stats.totalGiftPlans)}
              />
              <MetricCard
                label="Media bugetului"
                value={formatMoney(stats.averageBudget)}
              />
              <MetricCard label="Buget maxim" value={formatMoney(stats.maxBudget)} />
              <MetricCard label="Buget minim" value={formatMoney(stats.minBudget)} />
              <MetricCard
                label="Media zilelor pana la cumparare"
                value={`${formatNumber(stats.averageDaysToPurchase)} zile`}
              />
              <MetricCard
                label="Media intarzierilor"
                value={`${formatNumber(stats.averageDelayDays)} zile`}
              />
              <MetricCard
                label="Cumparate la timp"
                value={`${formatNumber(stats.onTimePercent)}%`}
                hint={`${stats.onTimeCount} cadouri`}
                tone="success"
              />
              <MetricCard
                label="Cumparate cu intarziere"
                value={`${formatNumber(stats.latePercent)}%`}
                hint={`${stats.lateCount} cadouri`}
                tone="danger"
              />
              <MetricCard
                label="Cel mai ieftin ales si cumparat"
                value={`${formatNumber(stats.purchasedCheapestProductsPercent)}%`}
                hint={`${stats.purchasedCheapestProductsCount} din ${stats.purchasedProductsCount} produse cumparate`}
                tone="success"
              />
              <MetricCard
                label="Produse negasite in cautari"
                value={`${formatNumber(stats.manualSearchFallbackProductsPercent)}%`}
                hint={`${stats.manualSearchFallbackProductsCount} din ${stats.selectedProductsCount} produse adaugate`}
                tone="danger"
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Interpretare rapida</Text>
              <Text style={styles.cardText}>
                Procentele pentru cumparare la timp sunt calculate doar pentru cadourile
                marcate ca fiind cumparate. Bugetele includ cadourile care se potrivesc
                filtrelor selectate.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Statistici</Text>

      <Pressable
        style={({ hovered, pressed }) => [
          styles.card,
          styles.clickableCard,
          hovered && styles.clickableCardHover,
          pressed && styles.clickableCardPressed,
        ]}
        onPress={() => setView('users')}
      >
        <Text style={styles.cardTitle}>Statistici useri</Text>
        <Text style={styles.cardText}>
          Vezi bugete, ritm de cumparare, intarzieri si diferente pe gen, an sau
          scopul cadoului.
        </Text>
      </Pressable>

      <Pressable
        style={({ hovered, pressed }) => [
          styles.card,
          styles.clickableCard,
          styles.storeClickableCard,
          hovered && styles.clickableCardHover,
          pressed && styles.clickableCardPressed,
        ]}
        onPress={() => setView('stores')}
      >
        <Text style={styles.cardTitle}>Statistici magazine</Text>
        <Text style={styles.cardText}>
          Vezi categoriile cumparate, magazinele cele mai cautate si produsele
          cumparate cel mai des, filtrate dupa an, scop si gen.
        </Text>
      </Pressable>

      <Pressable
        style={({ hovered, pressed }) => [
          styles.card,
          styles.clickableCard,
          styles.productDemandClickableCard,
          hovered && styles.clickableCardHover,
          pressed && styles.clickableCardPressed,
        ]}
        onPress={() => setView('productDemand')}
      >
        <Text style={styles.cardTitle}>Cerere de produse</Text>
        <Text style={styles.cardText}>
          Vezi produsele pe care userii nu le-au gasit in cautari si le-au
          adaugat manual, de la cele mai dorite la cele mai rare.
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'success' | 'danger';
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          tone === 'success' && styles.metricValueSuccess,
          tone === 'danger' && styles.metricValueDanger,
        ]}
      >
        {value}
      </Text>
      {!!hint && <Text style={styles.metricHint}>{hint}</Text>}
    </View>
  );
}

function TopListCard({
  title,
  entries,
  emptyText,
  tone,
}: {
  title: string;
  entries: TopEntry[];
  emptyText: string;
  tone?: 'success';
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>

      {entries.length === 0 ? (
        <Text style={styles.cardText}>{emptyText}</Text>
      ) : (
        entries.map((entry, index) => (
          <View key={`${entry.label}-${index}`} style={styles.topRow}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>{index + 1}</Text>
            </View>
            <View style={styles.topInfo}>
              <Text style={styles.topLabel}>{entry.label}</Text>
              {!!entry.hint && <Text style={styles.metricHint}>{entry.hint}</Text>}
            </View>
            <Text
              style={[
                styles.topCount,
                tone === 'success' && styles.metricValueSuccess,
              ]}
            >
              {entry.count}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 36,
    backgroundColor: '#fff7ed',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#be123c',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fce7e0',
  },
  clickableCard: {
    borderTopWidth: 4,
    borderTopColor: '#f59e0b',
  },
  storeClickableCard: {
    borderTopColor: '#0d9488',
  },
  productDemandClickableCard: {
    borderTopColor: '#2563eb',
  },
  clickableCardHover: {
    backgroundColor: '#fff7ed',
    transform: [{ translateY: -2 }],
  },
  clickableCardPressed: {
    transform: [{ scale: 0.99 }],
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
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffe4e6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '900',
  },
  filtersCard: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fce7e0',
    backgroundColor: '#fff',
    gap: 10,
  },
  searchInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
    color: '#111827',
    fontSize: 14,
    marginTop: 12,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  segmentedButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedButtonActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  segmentedButtonText: {
    color: '#6b7280',
    fontWeight: '900',
  },
  segmentedButtonTextActive: {
    color: '#fff',
  },
  dropdown: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
  },
  dropdownContainer: {
    borderRadius: 8,
    borderColor: '#e5e7eb',
  },
  dropdownPlaceholder: {
    color: '#9ca3af',
    fontSize: 14,
  },
  dropdownSelectedText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: 10,
  },
  checkboxButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxButtonActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  checkboxText: {
    color: '#6b7280',
    fontWeight: '900',
  },
  checkboxTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 220,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fce7e0',
  },
  metricLabel: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },
  metricValue: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  metricValueSuccess: {
    color: '#16a34a',
  },
  metricValueDanger: {
    color: '#dc2626',
  },
  metricHint: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '900',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#fce7e0',
    paddingVertical: 12,
  },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fce7e0',
  },
  rankBadgeText: {
    color: '#be123c',
    fontWeight: '900',
  },
  topInfo: {
    flex: 1,
  },
  topLabel: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  topCount: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
});
