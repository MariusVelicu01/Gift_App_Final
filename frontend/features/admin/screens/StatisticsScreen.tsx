import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getModalBackdropResponder } from '../../../utils/modalBackdrop';
import { Dropdown } from 'react-native-element-dropdown';
import { useAuth } from '../../../context/AuthContext';
import {
  AdminUserStatisticsGiftPlan,
  getAdminUserStatistics,
} from '../../../services/adminStatisticsApi';
import { C, R, S } from '../../../constants/theme';
import {
  generateUsersReport,
  generateStoresReport,
  generateProductDemandReport,
} from '../../../utils/reportGenerator';
import { getAdminPartnerStoresCache, subscribeAdminPartnerStoresCache } from '../../../services/adminPartnerStoresCache';

type GenderFilter = 'male' | 'female';
type StatsView = 'overview' | 'users' | 'stores' | 'productDemand';
type ProductDemandFilter = 'added' | 'purchased';

type TopEntry = {
  label: string;
  count: number;
  hint?: string;
  storeName?: string;
};

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return '-';
  return `${Number(value.toFixed(2))} RON`;
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
  const [productDemandPage, setProductDemandPage] = useState(0);
  const [partnerStoreNames, setPartnerStoreNames] = useState<Set<string>>(new Set());
  const [nonPartnerModalVisible, setNonPartnerModalVisible] = useState(false);
  const [categoriesModalVisible, setCategoriesModalVisible] = useState(false);
  const [topProductsModalVisible, setTopProductsModalVisible] = useState(false);
  const [allStoresModalVisible, setAllStoresModalVisible] = useState(false);
  const [allStoresFilter, setAllStoresFilter] = useState<'all' | 'partner' | 'non-partner'>('all');

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

  useEffect(() => {
    if (!token) return;
    getAdminPartnerStoresCache(token).then((stores) => {
      setPartnerStoreNames(
        new Set((stores || []).map((s) => (s.displayName || s.companyName || '').toLowerCase().trim()))
      );
    }).catch(() => {});

    return subscribeAdminPartnerStoresCache(() => {
      if (!token) return;
      getAdminPartnerStoresCache(token).then((stores) => {
        setPartnerStoreNames(
          new Set((stores || []).map((s) => (s.displayName || s.companyName || '').toLowerCase().trim()))
        );
      }).catch(() => {});
    });
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
          : selectedGenders.length === 2
          ? true
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
    const productDemandPurchasedPrices = new Map<string, number[]>();
    const purchasedProducts = selectedProducts.filter((product) => product.isPurchased);

    selectedProducts.forEach((product) => {
      if (product.storeId !== 'manual' && product.productKey) {
        addCount(listedStoreMap, product.storeName || 'Magazin necunoscut');
      }

      if (product.manualSearchFallback || product.storeId === 'manual' || !product.productKey) {
        addCount(productDemandAddedMap, product.name || 'Produs fara nume');

        if (product.isPurchased || product.wasEverPurchased) {
          const label = (product.name || 'Produs fara nume').trim();
          addCount(productDemandPurchasedMap, label);
          if (product.purchasePrice > 0) {
            const existing = productDemandPurchasedPrices.get(label) || [];
            existing.push(product.purchasePrice);
            productDemandPurchasedPrices.set(label, existing);
          }
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
      const existingProduct = purchasedProductMap.get(productName);
      if (existingProduct) {
        existingProduct.count++;
      } else {
        purchasedProductMap.set(productName, { label: productName, count: 1, hint: product.category || undefined, storeName });
      }
    });

    const partnerStoreEntries: TopEntry[] = [];
    const nonPartnerStoreMap = new Map<string, number>();
    purchasedStoreMap.forEach((entry, key) => {
      const isPartner = partnerStoreNames.has(key.toLowerCase().trim());
      if (isPartner) {
        partnerStoreEntries.push(entry);
      } else {
        nonPartnerStoreMap.set(key, entry.count);
      }
    });
    partnerStoreEntries.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    const MANUAL_LABELS = new Set(['manual', 'adaugat manual', 'magazin necunoscut', '']);
    let alteMagazineCount = 0;
    const namedNonPartnerMap = new Map<string, number>();
    nonPartnerStoreMap.forEach((count, key) => {
      if (MANUAL_LABELS.has(key.toLowerCase().trim())) {
        alteMagazineCount += count;
      } else {
        namedNonPartnerMap.set(key, count);
      }
    });
    const nonPartnerTotal = Array.from(nonPartnerStoreMap.values()).reduce((s, c) => s + c, 0);
    const nonPartnerDetails: TopEntry[] = [
      ...Array.from(namedNonPartnerMap.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
      ...(alteMagazineCount > 0 ? [{ label: 'Alte Magazine', count: alteMagazineCount }] : []),
    ];
    const purchasedStoresFiltered: TopEntry[] = [
      ...partnerStoreEntries.slice(0, 4),
      ...(nonPartnerTotal > 0 ? [{ label: 'Magazine fara contract de afiliere', count: nonPartnerTotal, hint: 'non-partner' }] : []),
    ];

    return {
      listedProductsCount: selectedProducts.length,
      purchasedProductsCount: purchasedProducts.length,
      purchasedCategories: toTopEntries(purchasedCategoryMap),
      listedStores: toTopEntries(listedStoreMap),
      purchasedStores: purchasedStoresFiltered,
      allPartnerStores: partnerStoreEntries,
      nonPartnerStores: nonPartnerDetails,
      topPurchasedProducts: toTopEntries(purchasedProductMap),
      productDemandAdded: toTopEntries(productDemandAddedMap),
      productDemandPurchased: toTopEntries(productDemandPurchasedMap).map((entry) => {
        const prices = productDemandPurchasedPrices.get(entry.label) || [];
        if (prices.length === 0) return entry;
        const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
        return { ...entry, hint: `~${Math.round(avg)} RON` };
      }),
    };
  }, [filteredGiftPlans, partnerStoreNames]);

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

  const reportFilters = useMemo(
    () => ({
      year: selectedYear,
      purpose: selectedPurpose,
      genders: selectedGenders,
    }),
    [selectedYear, selectedPurpose, selectedGenders]
  );

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

        <View style={styles.overviewHeader}>
          <Text style={styles.title}>
            {isProductDemandView
              ? 'Cerere de produse'
              : isStoreView
              ? 'Statistici magazine'
              : 'Statistici useri'}
          </Text>
          <Pressable
            style={({ hovered, pressed }) => [
              styles.overviewExportBtn,
              hovered && styles.reportButtonHover,
              pressed && styles.reportButtonPressed,
            ]}
            onPress={() => {
              if (isProductDemandView) generateProductDemandReport(storeStats, reportFilters);
              else if (isStoreView) generateStoresReport(storeStats, reportFilters);
              else generateUsersReport(stats, reportFilters);
            }}
          >
            <Text style={styles.reportButtonText}>↓ Descarcă raport Excel</Text>
          </Pressable>
        </View>

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
              onChangeText={(v) => { setProductDemandSearch(v); setProductDemandPage(0); }}
            />

            <View style={styles.segmentedRow}>
              <Pressable
                style={[
                  styles.segmentedButton,
                  productDemandFilter === 'added' && styles.segmentedButtonActive,
                ]}
                onPress={() => { setProductDemandFilter('added'); setProductDemandPage(0); }}
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
                onPress={() => { setProductDemandFilter('purchased'); setProductDemandPage(0); }}
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
              <>
                {productDemandEntries.slice(productDemandPage * 10, (productDemandPage + 1) * 10).map((entry, index) => (
                  <View key={`${entry.label}-${index}`} style={styles.topRow}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>{productDemandPage * 10 + index + 1}</Text>
                    </View>
                    <View style={styles.topInfo}>
                      <Text style={styles.topLabel}>{entry.label}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={styles.topCount}>{entry.count}</Text>
                      {!!entry.hint && productDemandFilter === 'purchased' && (
                        <Text style={[styles.metricHint, { fontSize: 13 }]}>{entry.hint}</Text>
                      )}
                    </View>
                  </View>
                ))}
                {(() => {
                  const totalPages = Math.ceil(productDemandEntries.length / 10);
                  if (totalPages <= 1) return null;
                  const pages: (number | '...')[] = [];
                  if (totalPages <= 7) {
                    for (let i = 0; i < totalPages; i++) pages.push(i);
                  } else {
                    pages.push(0);
                    if (productDemandPage > 2) pages.push('...');
                    for (let i = Math.max(1, productDemandPage - 1); i <= Math.min(totalPages - 2, productDemandPage + 1); i++) pages.push(i);
                    if (productDemandPage < totalPages - 3) pages.push('...');
                    pages.push(totalPages - 1);
                  }
                  return (
                    <View style={styles.paginationRow}>
                      <Pressable
                        style={[styles.paginationButton, productDemandPage === 0 && styles.paginationButtonDisabled]}
                        onPress={() => setProductDemandPage((p) => Math.max(0, p - 1))}
                        disabled={productDemandPage === 0}
                      >
                        <Text style={styles.paginationButtonText}>‹ Inapoi</Text>
                      </Pressable>
                      {pages.map((p, i) =>
                        p === '...' ? (
                          <Text key={`e-${i}`} style={styles.paginationEllipsis}>…</Text>
                        ) : (
                          <Pressable
                            key={p}
                            style={[styles.paginationPageBtn, p === productDemandPage && styles.paginationPageBtnActive]}
                            onPress={() => setProductDemandPage(p)}
                          >
                            <Text style={[styles.paginationPageText, p === productDemandPage && styles.paginationPageTextActive]}>
                              {p + 1}
                            </Text>
                          </Pressable>
                        )
                      )}
                      <Pressable
                        style={[styles.paginationButton, productDemandPage >= totalPages - 1 && styles.paginationButtonDisabled]}
                        onPress={() => setProductDemandPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={productDemandPage >= totalPages - 1}
                      >
                        <Text style={styles.paginationButtonText}>Inainte ›</Text>
                      </Pressable>
                    </View>
                  );
                })()}
              </>
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

            <View style={styles.card}>
              <View style={styles.overviewHeader}>
                <Text style={styles.cardTitle}>Categorii de produse cumparate</Text>
                {storeStats.purchasedCategories.length > 10 && (
                  <Pressable onPress={() => setCategoriesModalVisible(true)}>
                    <Text style={styles.reportButtonText}>Vezi toate ({storeStats.purchasedCategories.length})</Text>
                  </Pressable>
                )}
              </View>
              {storeStats.purchasedCategories.length === 0 ? (
                <Text style={styles.cardText}>Nu exista produse cumparate pentru filtrele selectate.</Text>
              ) : (
                storeStats.purchasedCategories.slice(0, 10).map((entry, index) => (
                  <View key={`${entry.label}-${index}`} style={styles.topRow}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>{index + 1}</Text>
                    </View>
                    <View style={styles.topInfo}>
                      <Text style={styles.topLabel}>{entry.label}</Text>
                      {!!entry.hint && <Text style={styles.metricHint}>{entry.hint}</Text>}
                    </View>
                    <Text style={styles.topCount}>{entry.count}</Text>
                  </View>
                ))
              )}
            </View>

            <Modal
              visible={categoriesModalVisible}
              animationType="slide"
              transparent
              onRequestClose={() => setCategoriesModalVisible(false)}
            >
              <View style={styles.nonPartnerOverlay} {...getModalBackdropResponder(() => setCategoriesModalVisible(false))}>
                <View style={styles.nonPartnerModal}>
                  <View style={styles.handle} />
                  <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
                    <Text style={styles.cardTitle}>Toate categoriile cumparate</Text>
                    {storeStats.purchasedCategories.map((entry, index) => (
                      <View key={`${entry.label}-${index}`} style={styles.topRow}>
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankBadgeText}>{index + 1}</Text>
                        </View>
                        <View style={styles.topInfo}>
                          <Text style={styles.topLabel}>{entry.label}</Text>
                          {!!entry.hint && <Text style={styles.metricHint}>{entry.hint}</Text>}
                        </View>
                        <Text style={styles.topCount}>{entry.count}</Text>
                      </View>
                    ))}
                  </ScrollView>
                  <Pressable
                    style={[styles.secondaryButton, { margin: 16 }]}
                    onPress={() => setCategoriesModalVisible(false)}
                  >
                    <Text style={styles.secondaryButtonText}>Inchide</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

            <View style={styles.card}>
              <View style={styles.overviewHeader}>
                <Text style={styles.cardTitle}>Cele mai cautate magazine cumparate</Text>
                {partnerStoreNames.size > 0 && (
                  <Pressable onPress={() => { setAllStoresFilter('all'); setAllStoresModalVisible(true); }}>
                    <Text style={styles.reportButtonText}>
                      Vezi toate ({storeStats.purchasedStores.filter(e => e.hint !== 'non-partner').length + (storeStats.nonPartnerStores?.length ?? 0)})
                    </Text>
                  </Pressable>
                )}
              </View>
              {storeStats.purchasedStores.length === 0 ? (
                <Text style={styles.cardText}>Nu exista produse cumparate pentru filtrele selectate.</Text>
              ) : (
                storeStats.purchasedStores.map((entry, index) => {
                  const isNonPartner = entry.hint === 'non-partner';
                  return (
                    <Pressable
                      key={entry.label}
                      style={({ pressed }) => [styles.topRow, isNonPartner && { opacity: pressed ? 0.7 : 1 }]}
                      onPress={isNonPartner ? () => setNonPartnerModalVisible(true) : undefined}
                    >
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankBadgeText}>{index + 1}</Text>
                      </View>
                      <View style={styles.topInfo}>
                        <Text style={[styles.topLabel, isNonPartner && { color: C.textDim, fontStyle: 'italic' }]}>
                          {entry.label}
                        </Text>
                        {isNonPartner && (
                          <Text style={styles.metricHint}>Apasa pentru detalii</Text>
                        )}
                      </View>
                      <Text style={styles.topCount}>{entry.count}</Text>
                    </Pressable>
                  );
                })
              )}
            </View>

            <Modal
              visible={nonPartnerModalVisible}
              animationType="slide"
              transparent
              onRequestClose={() => setNonPartnerModalVisible(false)}
            >
              <View style={styles.nonPartnerOverlay} {...getModalBackdropResponder(() => setNonPartnerModalVisible(false))}>
                <View style={styles.nonPartnerModal}>
                  <View style={styles.handle} />
                  <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
                    <Text style={styles.cardTitle}>Magazine fara contract de afiliere</Text>
                    <Text style={styles.cardText}>Magazine din care clientii au cumparat fara un acord de parteneriat.</Text>
                    {storeStats.nonPartnerStores?.map((entry, index) => (
                      <View key={entry.label} style={styles.topRow}>
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankBadgeText}>{index + 1}</Text>
                        </View>
                        <Text style={[styles.topInfo, { flex: 1 }]}>{entry.label}</Text>
                        <Text style={styles.topCount}>{entry.count}</Text>
                      </View>
                    ))}
                  </ScrollView>
                  <Pressable
                    style={[styles.secondaryButton, { margin: 16 }]}
                    onPress={() => setNonPartnerModalVisible(false)}
                  >
                    <Text style={styles.secondaryButtonText}>Inchide</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

            <Modal
              visible={allStoresModalVisible}
              animationType="slide"
              transparent
              onRequestClose={() => setAllStoresModalVisible(false)}
            >
              <View style={styles.nonPartnerOverlay} {...getModalBackdropResponder(() => setAllStoresModalVisible(false))}>
                <View style={styles.nonPartnerModal}>
                  <View style={styles.handle} />
                  <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
                    <Text style={styles.cardTitle}>Toate magazinele cumparate</Text>

                    <Dropdown
                      style={styles.dropdown}
                      containerStyle={styles.dropdownContainer}
                      placeholderStyle={styles.dropdownPlaceholder}
                      selectedTextStyle={styles.dropdownSelectedText}
                      data={[
                        { label: 'Toate magazinele', value: 'all' },
                        { label: 'Parteneri', value: 'partner' },
                        { label: 'Fara contract', value: 'non-partner' },
                      ]}
                      maxHeight={160}
                      labelField="label"
                      valueField="value"
                      value={allStoresFilter}
                      onChange={(item) => setAllStoresFilter(item.value)}
                    />

                    <View style={styles.storeLegendRow}>
                      <View style={styles.storeLegendItem}>
                        <View style={[styles.storeLegendDot, { backgroundColor: '#d1fae5' }]} />
                        <Text style={styles.storeLegendText}>Magazin partener</Text>
                      </View>
                      <View style={styles.storeLegendItem}>
                        <View style={[styles.storeLegendDot, { backgroundColor: '#fef9c3' }]} />
                        <Text style={styles.storeLegendText}>Fara contract</Text>
                      </View>
                    </View>

                    {(() => {
                      const partners = (storeStats.allPartnerStores || []).map(e => ({ ...e, isPartner: true }));
                      const nonPartners = (storeStats.nonPartnerStores || []).map(e => ({ ...e, isPartner: false }));
                      const combined =
                        allStoresFilter === 'partner' ? partners :
                        allStoresFilter === 'non-partner' ? nonPartners :
                        [...partners, ...nonPartners].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
                      return combined.map((entry, index) => (
                        <View
                          key={`${entry.label}-${index}`}
                          style={[styles.topRow, entry.isPartner ? styles.storeRowPartner : styles.storeRowNonPartner]}
                        >
                          <View style={styles.rankBadge}>
                            <Text style={styles.rankBadgeText}>{index + 1}</Text>
                          </View>
                          <Text style={[styles.topInfo, { flex: 1 }]}>{entry.label}</Text>
                          <Text style={[styles.topCount, entry.isPartner && styles.metricValueSuccess]}>{entry.count}</Text>
                        </View>
                      ));
                    })()}
                  </ScrollView>
                  <Pressable
                    style={[styles.secondaryButton, { margin: 16 }]}
                    onPress={() => setAllStoresModalVisible(false)}
                  >
                    <Text style={styles.secondaryButtonText}>Inchide</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

            <View style={styles.card}>
              <View style={styles.overviewHeader}>
                <Text style={styles.cardTitle}>Top 5 produse cumparate</Text>
                {storeStats.topPurchasedProducts.length > 5 && (
                  <Pressable onPress={() => setTopProductsModalVisible(true)}>
                    <Text style={styles.reportButtonText}>
                      Vezi toate ({storeStats.topPurchasedProducts.length})
                    </Text>
                  </Pressable>
                )}
              </View>
              {storeStats.topPurchasedProducts.length === 0 ? (
                <Text style={styles.cardText}>Nu exista produse cumparate pentru filtrele selectate.</Text>
              ) : (
                storeStats.topPurchasedProducts.slice(0, 5).map((entry, index) => (
                  <View key={`${entry.label}-${index}`} style={styles.topRow}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>{index + 1}</Text>
                    </View>
                    <View style={styles.topInfo}>
                      <Text style={styles.topLabel}>{entry.label}</Text>
                      {!!entry.hint && <Text style={styles.metricHint}>{entry.hint}</Text>}
                    </View>
                    <Text style={[styles.topCount, styles.metricValueSuccess]}>{entry.count}</Text>
                  </View>
                ))
              )}
            </View>

            <Modal
              visible={topProductsModalVisible}
              animationType="slide"
              transparent
              onRequestClose={() => setTopProductsModalVisible(false)}
            >
              <View style={styles.nonPartnerOverlay} {...getModalBackdropResponder(() => setTopProductsModalVisible(false))}>
                <View style={styles.nonPartnerModal}>
                  <View style={styles.handle} />
                  <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
                    <Text style={styles.cardTitle}>Toate produsele cumparate</Text>
                    <View style={styles.storeLegendRow}>
                      <View style={styles.storeLegendItem}>
                        <View style={[styles.storeLegendDot, { backgroundColor: '#d1fae5' }]} />
                        <Text style={styles.storeLegendText}>Produs din magazin partener</Text>
                      </View>
                      <View style={styles.storeLegendItem}>
                        <View style={[styles.storeLegendDot, { backgroundColor: '#fef9c3' }]} />
                        <Text style={styles.storeLegendText}>Alt magazin</Text>
                      </View>
                    </View>
                    {storeStats.topPurchasedProducts.map((entry, index) => {
                      const isPartner = partnerStoreNames.has((entry.storeName || '').toLowerCase().trim());
                      return (
                        <View key={`${entry.label}-${index}`} style={[styles.topRow, isPartner ? styles.storeRowPartner : styles.storeRowNonPartner]}>
                          <View style={styles.rankBadge}>
                            <Text style={styles.rankBadgeText}>{index + 1}</Text>
                          </View>
                          <View style={styles.topInfo}>
                            <Text style={styles.topLabel}>{entry.label}</Text>
                            {!!entry.hint && <Text style={styles.metricHint}>{entry.hint}</Text>}
                          </View>
                          <Text style={[styles.topCount, isPartner && styles.metricValueSuccess]}>{entry.count}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                  <Pressable
                    style={[styles.secondaryButton, { margin: 16 }]}
                    onPress={() => setTopProductsModalVisible(false)}
                  >
                    <Text style={styles.secondaryButtonText}>Inchide</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

          </>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <MetricCard
                label="Cadouri"
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
              <Text style={styles.cardTitle}>Nota:</Text>
              <Text style={styles.cardText}>
                Procentele pentru cumparare la timp sunt calculate doar pentru cadourile marcate ca fiind cumparate.
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

      <View style={[styles.card, styles.clickableCard]}>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.cardBody,
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
      </View>

      <View style={[styles.card, styles.clickableCard, styles.storeClickableCard]}>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.cardBody,
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
      </View>

      <View style={[styles.card, styles.clickableCard, styles.productDemandClickableCard]}>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.cardBody,
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
      </View>

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
    backgroundColor: C.bg,
  },
  storeLegendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  storeLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeLegendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  storeLegendText: {
    fontSize: 13,
    color: C.textDim,
  },
  storeRowPartner: {
    backgroundColor: '#d1fae5',
    borderRadius: R.sm,
    paddingHorizontal: 8,
  },
  storeRowNonPartner: {
    backgroundColor: '#fef9c3',
    borderRadius: R.sm,
    paddingHorizontal: 8,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  paginationButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: R.sm,
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  paginationButtonDisabled: {
    opacity: 0.35,
  },
  paginationButtonText: {
    color: C.text,
    fontWeight: '600',
    fontSize: 14,
  },
  paginationPageBtn: {
    minWidth: 34,
    height: 34,
    borderRadius: R.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  paginationPageBtnActive: {
    backgroundColor: C.accent,
  },
  paginationPageText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textDim,
  },
  paginationPageTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  paginationEllipsis: {
    fontSize: 14,
    color: C.textDim,
    paddingHorizontal: 4,
    alignSelf: 'center',
  },
  nonPartnerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  nonPartnerModal: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xxl,
    borderTopRightRadius: R.xxl,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  overviewExportBtn: {
    backgroundColor: C.accentSoft,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: R.md,
  },
  title: {
    fontSize: 28,
    fontFamily: 'serif',
    fontWeight: '400',
    color: C.text,
  },
  card: {
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    ...S.card,
  },
  clickableCard: {
    borderTopWidth: 3,
    borderTopColor: C.warn,
    padding: 0,
    overflow: 'hidden',
  },
  cardBody: {
    padding: 16,
  },
  cardDivider: {
    height: 0.5,
    backgroundColor: C.border,
  },
  reportButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
  },
  reportButtonStore: {
    backgroundColor: C.surface2,
  },
  reportButtonDemand: {
    backgroundColor: C.surface2,
  },
  reportButtonHover: {
    opacity: 0.8,
  },
  reportButtonPressed: {
    opacity: 0.6,
  },
  reportButtonText: {
    color: C.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  storeClickableCard: {
    borderTopColor: C.sage,
  },
  productDemandClickableCard: {
    borderTopColor: C.accent,
  },
  clickableCardHover: {
    backgroundColor: C.surface2,
    transform: [{ translateY: -2 }],
  },
  clickableCardPressed: {
    transform: [{ scale: 0.99 }],
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    color: C.text,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: C.textDim,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: C.accentSoft,
    borderRadius: R.pill,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: C.accent,
    fontWeight: '700',
  },
  filtersCard: {
    padding: 14,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    backgroundColor: C.surface,
    gap: 10,
    ...S.card,
  },
  searchInput: {
    minHeight: 48,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 12,
    backgroundColor: C.surface2,
    color: C.text,
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
    borderRadius: R.pill,
    borderWidth: 0.5,
    borderColor: C.borderStrong,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedButtonActive: {
    backgroundColor: C.sage,
    borderColor: C.sage,
  },
  segmentedButtonText: {
    color: C.textDim,
    fontWeight: '700',
  },
  segmentedButtonTextActive: {
    color: C.accentInk,
  },
  dropdown: {
    minHeight: 48,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 12,
    backgroundColor: C.surface2,
  },
  dropdownContainer: {
    borderRadius: R.md,
    borderColor: C.border,
  },
  dropdownPlaceholder: {
    color: C.textFaint,
    fontSize: 14,
  },
  dropdownSelectedText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: 10,
  },
  checkboxButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: R.pill,
    borderWidth: 0.5,
    borderColor: C.borderStrong,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxButtonActive: {
    backgroundColor: C.warn,
    borderColor: C.warn,
  },
  checkboxText: {
    color: C.textDim,
    fontWeight: '700',
  },
  checkboxTextActive: {
    color: C.accentInk,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 220,
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    ...S.card,
  },
  metricLabel: {
    color: C.textDim,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  metricValue: {
    color: C.text,
    fontSize: 24,
    fontFamily: 'serif',
    fontWeight: '400',
  },
  metricValueSuccess: {
    color: C.sage,
  },
  metricValueDanger: {
    color: C.danger,
  },
  metricHint: {
    color: C.textFaint,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  errorText: {
    color: C.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingVertical: 12,
  },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: C.border,
  },
  rankBadgeText: {
    color: C.accent,
    fontWeight: '700',
  },
  topInfo: {
    flex: 1,
  },
  topLabel: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
  },
  topCount: {
    color: C.text,
    fontSize: 20,
    fontFamily: 'serif',
    fontWeight: '400',
  },
});
