import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { useAuth } from '../../../context/AuthContext';
import { getLovedOneById } from '../../../services/lovedOnesApi';
import {
  completeGiftPlan,
  createGiftPlan,
  deleteGiftPlan,
  getGiftPlans,
  updateGiftPlan,
} from '../../../services/giftPlansApi';
import AddLovedOneModal from '../../../components/AddLovedOneModal';
import { LovedOne } from '../../../types/lovedOnes';
import { GiftPlan, GiftPurpose } from '../../../types/giftPlans';

const GIFT_PURPOSE_OPTIONS = [
  { label: 'Zi de nastere', value: 'Zi de nastere' },
  { label: 'Craciun', value: 'Craciun' },
  { label: 'Paste', value: 'Paste' },
  { label: 'Zi de nume', value: 'Zi de nume' },
  { label: 'Aniversare', value: 'Aniversare' },
  { label: 'Multumire', value: 'Multumire' },
  { label: 'Alta ocazie', value: 'Alta ocazie' },
];

const BUDGET_OPTIONS = [50, 100, 200, 300, 500, 750, 1000];

const CUSTOM_DATE_PURPOSES: GiftPurpose[] = [
  'Zi de nume',
  'Aniversare',
  'Multumire',
  'Alta ocazie',
];

const HISTORY_FILTER_OPTIONS = [
  { label: 'Toate', value: 'all' },
  ...GIFT_PURPOSE_OPTIONS,
];

const REACTION_OPTIONS = [
  { value: 1, label: ':(' },
  { value: 2, label: ':/' },
  { value: 3, label: ':|' },
  { value: 4, label: ':)' },
  { value: 5, label: ':D' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  label: String(i + 1).padStart(2, '0'),
  value: i + 1,
}));

const MONTHS = [
  { label: 'Ianuarie', value: 1 },
  { label: 'Februarie', value: 2 },
  { label: 'Martie', value: 3 },
  { label: 'Aprilie', value: 4 },
  { label: 'Mai', value: 5 },
  { label: 'Iunie', value: 6 },
  { label: 'Iulie', value: 7 },
  { label: 'August', value: 8 },
  { label: 'Septembrie', value: 9 },
  { label: 'Octombrie', value: 10 },
  { label: 'Noiembrie', value: 11 },
  { label: 'Decembrie', value: 12 },
];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function getTodayParts() {
  const today = new Date();
  return {
    day: today.getDate(),
    month: today.getMonth() + 1,
    year: today.getFullYear(),
  };
}

function getYearOptions() {
  const currentYear = new Date().getFullYear();

  return Array.from({ length: 31 }, (_, i) => {
    const year = currentYear + i;
    return { label: String(year), value: year };
  });
}

function isCustomDatePurpose(purpose: string | null) {
  return CUSTOM_DATE_PURPOSES.includes(purpose as GiftPurpose);
}

function isDateBeforeToday(day: number, month: number, year: number) {
  const selected = `${year}-${pad(month)}-${pad(day)}`;
  const today = getTodayParts();
  const todayKey = `${today.year}-${pad(today.month)}-${pad(today.day)}`;

  return selected < todayKey;
}

function parseDateParts(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { day, month, year };
}

function formatDate(dateKey: string) {
  const { day, month, year } = parseDateParts(dateKey);
  return `${pad(day)}.${pad(month)}.${year}`;
}

function getYearFromDateKey(dateKey: string) {
  return parseDateParts(dateKey).year;
}

function getZodiac(day: number, month: number) {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Berbec';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taur';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemeni';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Rac';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leu';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Fecioară';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Balanță';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpion';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Săgetător';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Vărsător';
  return 'Pești';
}

type Props = {
  lovedOneId: string;
  onBack: () => void;
};

export default function LovedOneDetailsScreen({ lovedOneId, onBack }: Props) {
  const { token } = useAuth();
  const [data, setData] = useState<LovedOne | null>(null);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [giftPurpose, setGiftPurpose] = useState<GiftPurpose | null>(null);
  const [giftBudget, setGiftBudget] = useState(200);
  const [customBudget, setCustomBudget] = useState('');
  const [isCustomBudget, setIsCustomBudget] = useState(false);
  const [deadlineDay, setDeadlineDay] = useState<number | null>(null);
  const [deadlineMonth, setDeadlineMonth] = useState<number | null>(null);
  const [deadlineYear, setDeadlineYear] = useState<number | null>(null);
  const [giftError, setGiftError] = useState('');
  const [giftPlans, setGiftPlans] = useState<GiftPlan[]>([]);
  const [giftPlansLoading, setGiftPlansLoading] = useState(false);
  const [editingGiftPlan, setEditingGiftPlan] = useState<GiftPlan | null>(null);
  const [selectedGiftPlan, setSelectedGiftPlan] = useState<GiftPlan | null>(null);
  const [savingGift, setSavingGift] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [experienceDetails, setExperienceDetails] = useState('');
  const [reactionRating, setReactionRating] = useState(3);
  const [completeError, setCompleteError] = useState('');
  const [completingGift, setCompletingGift] = useState(false);
  const [historyPurposeFilter, setHistoryPurposeFilter] = useState<'all' | GiftPurpose>('all');
  const [historyVisible, setHistoryVisible] = useState(false);

  const years = getYearOptions();

  const plannedGiftPlans = useMemo(() => {
    return giftPlans
      .filter((giftPlan) => giftPlan.status !== 'completed')
      .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate));
  }, [giftPlans]);

  const completedGiftPlans = useMemo(() => {
    return giftPlans
      .filter((giftPlan) => giftPlan.status === 'completed')
      .filter((giftPlan) => {
        if (historyPurposeFilter === 'all') return true;
        return giftPlan.purpose === historyPurposeFilter;
      })
      .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate));
  }, [giftPlans, historyPurposeFilter]);

  const currentYearPlannedBudget = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return plannedGiftPlans
      .filter((giftPlan) => getYearFromDateKey(giftPlan.deadlineDate) === currentYear)
      .reduce((total, giftPlan) => total + giftPlan.budget, 0);
  }, [plannedGiftPlans]);

  const totalPlannedBudget = useMemo(() => {
    return plannedGiftPlans.reduce(
      (total, giftPlan) => total + giftPlan.budget,
      0
    );
  }, [plannedGiftPlans]);

  const load = async () => {
    try {
      if (!token) return;
      setLoading(true);
      const [result, giftPlansResult] = await Promise.all([
        getLovedOneById(token, lovedOneId),
        getGiftPlans(token, lovedOneId),
      ]);
      setData(result);
      setGiftPlans(giftPlansResult);
    } finally {
      setLoading(false);
    }
  };

  const loadGiftPlans = async () => {
    try {
      if (!token) return;
      setGiftPlansLoading(true);
      const giftPlansResult = await getGiftPlans(token, lovedOneId);
      setGiftPlans(giftPlansResult);
    } catch (error) {
      console.error('LOAD GIFT PLANS ERROR:', error);
    } finally {
      setGiftPlansLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [lovedOneId, token]);

  const resetGiftForm = () => {
    setGiftPurpose(null);
    setGiftBudget(200);
    setCustomBudget('');
    setIsCustomBudget(false);
    setDeadlineDay(null);
    setDeadlineMonth(null);
    setDeadlineYear(null);
    setGiftError('');
    setEditingGiftPlan(null);
  };

  const resetCompleteForm = () => {
    setExperienceDetails('');
    setReactionRating(3);
    setCompleteError('');
  };

  const closeGiftModal = () => {
    resetGiftForm();
    setGiftModalVisible(false);
  };

  const openCreateGiftModal = () => {
    resetGiftForm();
    setGiftModalVisible(true);
  };

  const openEditGiftModal = (giftPlan: GiftPlan) => {
    if (!giftPlan.canModify) return;

    const isCustomBudgetValue = !BUDGET_OPTIONS.includes(giftPlan.budget);

    setEditingGiftPlan(giftPlan);
    setGiftPurpose(giftPlan.purpose);
    setGiftBudget(isCustomBudgetValue ? 200 : giftPlan.budget);
    setCustomBudget(isCustomBudgetValue ? String(giftPlan.budget) : '');
    setIsCustomBudget(isCustomBudgetValue);

    if (giftPlan.requiresCustomDate) {
      const parts = parseDateParts(giftPlan.deadlineDate);
      setDeadlineDay(parts.day);
      setDeadlineMonth(parts.month);
      setDeadlineYear(parts.year);
    } else {
      setDeadlineDay(null);
      setDeadlineMonth(null);
      setDeadlineYear(null);
    }

    setGiftError('');
    setGiftModalVisible(true);
  };

  const handlePurposeChange = (purpose: GiftPurpose) => {
    setGiftPurpose(purpose);
    setGiftError('');

    if (isCustomDatePurpose(purpose)) {
      const today = getTodayParts();
      setDeadlineDay((current) => current || today.day);
      setDeadlineMonth((current) => current || today.month);
      setDeadlineYear((current) => current || today.year);
    } else {
      setDeadlineDay(null);
      setDeadlineMonth(null);
      setDeadlineYear(null);
    }
  };

  const saveGiftPlan = async () => {
    if (!giftPurpose) {
      setGiftError('Selecteaza scopul cadoului.');
      return;
    }

    const selectedBudget = isCustomBudget ? Number(customBudget) : giftBudget;

    if (!Number.isFinite(selectedBudget) || selectedBudget <= 0) {
      setGiftError('Introdu o suma valida pentru buget.');
      return;
    }

    const requiresCustomDate = isCustomDatePurpose(giftPurpose);

    if (requiresCustomDate) {
      if (!deadlineDay || !deadlineMonth || !deadlineYear) {
        setGiftError('Selecteaza data limita pentru cadou.');
        return;
      }

      if (isDateBeforeToday(deadlineDay, deadlineMonth, deadlineYear)) {
        setGiftError('Data limita nu poate fi in trecut.');
        return;
      }
    }

    if (!token) return;

    try {
      setSavingGift(true);

      const payload = {
        purpose: giftPurpose,
        budget: selectedBudget,
        ...(requiresCustomDate
          ? {
              deadlineDay: deadlineDay!,
              deadlineMonth: deadlineMonth!,
              deadlineYear: deadlineYear!,
            }
          : {}),
      };

      if (editingGiftPlan) {
        await updateGiftPlan(token, lovedOneId, editingGiftPlan.id, payload);
      } else {
        await createGiftPlan(token, lovedOneId, payload);
      }

      await loadGiftPlans();
      closeGiftModal();
    } catch (error: any) {
      setGiftError(
        error?.message ||
          (editingGiftPlan
            ? 'Nu am putut actualiza cadoul.'
            : 'Nu am putut salva cadoul.')
      );
    } finally {
      setSavingGift(false);
    }
  };

  const openCompleteModal = () => {
    resetCompleteForm();
    setCompleteModalVisible(true);
  };

  const closeCompleteModal = () => {
    resetCompleteForm();
    setCompleteModalVisible(false);
  };

  const markGiftAsCompleted = async () => {
    if (!token || !selectedGiftPlan) return;

    if (!experienceDetails.trim()) {
      setCompleteError('Adauga detalii despre experienta persoanei dragi.');
      return;
    }

    try {
      setCompletingGift(true);
      const completedGiftPlan = await completeGiftPlan(
        token,
        lovedOneId,
        selectedGiftPlan.id,
        {
          experienceDetails: experienceDetails.trim(),
          reactionRating,
        }
      );

      await loadGiftPlans();
      setSelectedGiftPlan(completedGiftPlan);
      closeCompleteModal();
    } catch (error: any) {
      setCompleteError(error?.message || 'Nu am putut finaliza cadoul.');
    } finally {
      setCompletingGift(false);
    }
  };

  const removeGiftPlan = async (giftPlan: GiftPlan) => {
    if (!token || !giftPlan.canModify) return;

    const doDelete = async () => {
      try {
        await deleteGiftPlan(token, lovedOneId, giftPlan.id);
        await loadGiftPlans();
      } catch (error: any) {
        Alert.alert('Eroare', error?.message || 'Nu am putut sterge cadoul.');
      }
    };

    Alert.alert('Sterge cadoul', 'Sigur vrei sa stergi acest cadou?', [
      { text: 'Anuleaza', style: 'cancel' },
      { text: 'Sterge', style: 'destructive', onPress: doDelete },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Se încarcă...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text>Persoana nu a fost găsită.</Text>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Înapoi</Text>
        </Pressable>
      </View>
    );
  }

  const zodiac = getZodiac(data.day, data.month);
  const visibleSelectedGiftPlan = selectedGiftPlan
    ? giftPlans.find((giftPlan) => giftPlan.id === selectedGiftPlan.id) ||
      selectedGiftPlan
    : null;

  if (visibleSelectedGiftPlan) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable
          style={styles.backButton}
          onPress={() => setSelectedGiftPlan(null)}
        >
          <Text style={styles.backButtonText}>Inapoi la persoana</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{visibleSelectedGiftPlan.purpose}</Text>
          <Text style={styles.info}>
            Deadline: {formatDate(visibleSelectedGiftPlan.deadlineDate)}
          </Text>
          <Text style={styles.info}>
            Buget: {visibleSelectedGiftPlan.budget} RON
          </Text>
          <Text style={styles.info}>
            Status:{' '}
            {visibleSelectedGiftPlan.status === 'completed'
              ? 'Finalizat'
              : 'Planificat'}
          </Text>

          {visibleSelectedGiftPlan.status === 'completed' ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>Experienta</Text>
              <Text style={styles.notesText}>
                {visibleSelectedGiftPlan.experienceDetails}
              </Text>
              <Text style={styles.reactionSummary}>
                Reactie: {REACTION_OPTIONS.find(
                  (option) => option.value === visibleSelectedGiftPlan.reactionRating
                )?.label || ':|'}
              </Text>
            </View>
          ) : (
            <>
              <Pressable
                style={[
                  styles.saveGiftButton,
                  !visibleSelectedGiftPlan.canModify && styles.disabledButton,
                ]}
                onPress={openCompleteModal}
                disabled={!visibleSelectedGiftPlan.canModify}
              >
                <Text style={styles.saveGiftButtonText}>
                  Marcheaza ca finalizat
                </Text>
              </Pressable>

              {!visibleSelectedGiftPlan.canModify && (
                <Text style={styles.expiredText}>
                  Deadline expirat. Cadoul nu mai poate fi finalizat.
                </Text>
              )}
            </>
          )}
        </View>

        <Modal
          visible={completeModalVisible}
          animationType="slide"
          transparent
          onRequestClose={closeCompleteModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.giftModalCard}>
              <View style={styles.modalHandle} />

              <ScrollView contentContainerStyle={styles.giftModalBody}>
                <Text style={styles.modalTitle}>Finalizeaza cadoul</Text>

                {!!completeError && (
                  <Text style={styles.giftErrorText}>{completeError}</Text>
                )}

                <Text style={styles.modalLabel}>
                  Cum a fost experienta persoanei dragi?
                </Text>
                <TextInput
                  placeholder="Ex: s-a bucurat mult, a fost surprins, cadoul a fost potrivit..."
                  style={[styles.modalInput, styles.modalTextArea]}
                  multiline
                  value={experienceDetails}
                  onChangeText={(value) => {
                    setExperienceDetails(value);
                    if (completeError) setCompleteError('');
                  }}
                />

                <Text style={styles.modalLabel}>Reactia la cadou</Text>
                <View style={styles.reactionRow}>
                  {REACTION_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.reactionButton,
                        reactionRating === option.value &&
                          styles.reactionButtonSelected,
                      ]}
                      onPress={() => setReactionRating(option.value)}
                    >
                      <Text
                        style={[
                          styles.reactionText,
                          reactionRating === option.value &&
                            styles.reactionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  style={[styles.saveGiftButton, completingGift && styles.disabledButton]}
                  onPress={markGiftAsCompleted}
                  disabled={completingGift}
                >
                  <Text style={styles.saveGiftButtonText}>
                    {completingGift ? 'Se salveaza...' : 'Salveaza finalizarea'}
                  </Text>
                </Pressable>

                <Pressable style={styles.cancelGiftButton} onPress={closeCompleteModal}>
                  <Text style={styles.cancelGiftButtonText}>Inchide</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  if (historyVisible) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable
          style={styles.backButton}
          onPress={() => setHistoryVisible(false)}
        >
          <Text style={styles.backButtonText}>Inapoi la persoana</Text>
        </Pressable>

        <View style={styles.giftsSection}>
          <Text style={styles.sectionTitle}>Istoric cadouri</Text>

          <Dropdown
            style={styles.dropdown}
            containerStyle={styles.dropdownContainer}
            placeholderStyle={styles.dropdownPlaceholder}
            selectedTextStyle={styles.dropdownSelectedText}
            data={HISTORY_FILTER_OPTIONS}
            maxHeight={260}
            labelField="label"
            valueField="value"
            placeholder="Filtreaza dupa ocazie"
            value={historyPurposeFilter}
            onChange={(item) =>
              setHistoryPurposeFilter(item.value as 'all' | GiftPurpose)
            }
          />

          {giftPlansLoading ? (
            <ActivityIndicator />
          ) : completedGiftPlans.length === 0 ? (
            <Text style={styles.emptyHistoryText}>
              Nu exista cadouri finalizate pentru filtrul selectat.
            </Text>
          ) : (
            completedGiftPlans.map((gift) => (
              <Pressable
                key={gift.id}
                style={styles.historyItem}
                onPress={() => setSelectedGiftPlan(gift)}
              >
                <View style={styles.historyItemHeader}>
                  <Text style={styles.historyPurpose}>{gift.purpose}</Text>
                  <Text style={styles.historyBudget}>{gift.budget} RON</Text>
                </View>
                <Text style={styles.historyDeadline}>
                  Deadline: {formatDate(gift.deadlineDate)}
                </Text>
                <Text style={styles.historyDetails}>
                  Reactie: {REACTION_OPTIONS.find(
                    (option) => option.value === gift.reactionRating
                  )?.label || ':|'}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Înapoi</Text>
      </Pressable>

      <View style={styles.card}>
        {data.imageUrl ? (
          <Image source={{ uri: data.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              {data.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}

        <Text style={styles.name}>{data.name}</Text>

        <Text style={styles.info}>
          Data: {String(data.day).padStart(2, '0')}.{String(data.month).padStart(2, '0')}
          {data.year ? `.${data.year}` : ''}
        </Text>

        {!!data.estimatedAgeRange && (
          <Text style={styles.info}>Vârstă estimată: {data.estimatedAgeRange}</Text>
        )}

        <Text style={styles.info}>
          Gen:{' '}
          {data.gender === 'male'
            ? 'Masculin'
            : data.gender === 'female'
            ? 'Feminin'
            : '-'}
        </Text>

        <Text style={styles.info}>Zodie: {zodiac}</Text>

        {!!data.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Detalii</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        <Pressable style={styles.editButton} onPress={() => setEditVisible(true)}>
          <Text style={styles.editButtonText}>Editează</Text>
        </Pressable>
      </View>

      <View style={styles.giftsSection}>
        <Text style={styles.sectionTitle}>Cadouri</Text>

        <Pressable
          style={styles.newGiftButton}
          onPress={openCreateGiftModal}
        >
          <Text style={styles.newGiftButtonText}>Stabileste un nou cadou</Text>
        </Pressable>

        <View style={styles.budgetSummaryRow}>
          <View style={styles.budgetSummaryBox}>
            <Text style={styles.budgetSummaryLabel}>Anul curent</Text>
            <Text style={styles.budgetSummaryValue}>
              {currentYearPlannedBudget} RON
            </Text>
          </View>

          <View style={styles.budgetSummaryBox}>
            <Text style={styles.budgetSummaryLabel}>Total</Text>
            <Text style={styles.budgetSummaryValue}>
              {totalPlannedBudget} RON
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.historyButton}
          onPress={() => setHistoryVisible(true)}
        >
          <Text style={styles.historyButtonText}>Istoric cadouri</Text>
        </Pressable>

        <View style={styles.historyBox}>
          <Text style={styles.historyTitle}>Cadouri stabilite</Text>

          {giftPlansLoading ? (
            <ActivityIndicator />
          ) : plannedGiftPlans.length === 0 ? (
            <Text style={styles.emptyHistoryText}>
              Nu exista cadouri active pentru aceasta persoana.
            </Text>
          ) : (
            plannedGiftPlans.map((gift) => (
              <Pressable
                key={gift.id}
                style={styles.historyItem}
                onPress={() => setSelectedGiftPlan(gift)}
              >
                <View style={styles.historyItemHeader}>
                  <Text style={styles.historyPurpose}>{gift.purpose}</Text>
                  <Text style={styles.historyBudget}>{gift.budget} RON</Text>
                </View>
                <Text style={styles.historyDeadline}>
                  Deadline: {formatDate(gift.deadlineDate)}
                </Text>
                <View style={styles.historyActions}>
                  {gift.canModify ? (
                    <>
                      <Pressable
                        style={styles.historyActionButton}
                        onPress={() => openEditGiftModal(gift)}
                      >
                        <Text style={styles.historyActionText}>Editeaza</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.historyActionButton, styles.deleteActionButton]}
                        onPress={() => removeGiftPlan(gift)}
                      >
                        <Text style={styles.deleteActionText}>Sterge</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Text style={styles.expiredText}>
                      Deadline expirat. Cadoul ramane in istoric.
                    </Text>
                  )}
                </View>
              </Pressable>
            ))
          )}
        </View>
      </View>

      <AddLovedOneModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSaved={load}
        initialData={data}
      />

      <Modal
        visible={giftModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeGiftModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.giftModalCard}>
            <View style={styles.modalHandle} />

            <ScrollView
              contentContainerStyle={styles.giftModalBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>
                {editingGiftPlan ? 'Editeaza cadoul' : 'Stabileste un nou cadou'}
              </Text>

              {!!giftError && <Text style={styles.giftErrorText}>{giftError}</Text>}

              <Text style={styles.modalLabel}>Scopul cadoului</Text>
              <Dropdown
                style={styles.dropdown}
                containerStyle={styles.dropdownContainer}
                placeholderStyle={styles.dropdownPlaceholder}
                selectedTextStyle={styles.dropdownSelectedText}
                data={GIFT_PURPOSE_OPTIONS}
                maxHeight={260}
                labelField="label"
                valueField="value"
                placeholder="Alege ocazia"
                value={giftPurpose}
                onChange={(item) => {
                  handlePurposeChange(item.value as GiftPurpose);
                }}
              />

              {isCustomDatePurpose(giftPurpose) && (
                <>
                  <Text style={styles.modalLabel}>Data limita</Text>
                  <View style={styles.dateRow}>
                    <View style={styles.dateDropdownWrapper}>
                      <Dropdown
                        style={styles.compactDropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.dropdownPlaceholder}
                        selectedTextStyle={styles.dropdownSelectedText}
                        data={DAYS}
                        maxHeight={240}
                        labelField="label"
                        valueField="value"
                        placeholder="Zi"
                        value={deadlineDay}
                        onChange={(item) => {
                          setDeadlineDay(item.value);
                          setGiftError('');
                        }}
                      />
                    </View>

                    <View style={styles.dateDropdownWrapper}>
                      <Dropdown
                        style={styles.compactDropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.dropdownPlaceholder}
                        selectedTextStyle={styles.dropdownSelectedText}
                        data={MONTHS}
                        maxHeight={240}
                        labelField="label"
                        valueField="value"
                        placeholder="Luna"
                        value={deadlineMonth}
                        onChange={(item) => {
                          setDeadlineMonth(item.value);
                          setGiftError('');
                        }}
                      />
                    </View>

                    <View style={styles.dateDropdownWrapper}>
                      <Dropdown
                        style={styles.compactDropdown}
                        containerStyle={styles.dropdownContainer}
                        placeholderStyle={styles.dropdownPlaceholder}
                        selectedTextStyle={styles.dropdownSelectedText}
                        data={years}
                        maxHeight={240}
                        labelField="label"
                        valueField="value"
                        placeholder="An"
                        value={deadlineYear}
                        onChange={(item) => {
                          setDeadlineYear(item.value);
                          setGiftError('');
                        }}
                      />
                    </View>
                  </View>
                </>
              )}

              <View style={styles.budgetHeader}>
                <Text style={styles.modalLabel}>Buget</Text>
                <Text style={styles.budgetValue}>
                  {isCustomBudget && customBudget ? customBudget : giftBudget} RON
                </Text>
              </View>

              <View style={styles.budgetBar}>
                {BUDGET_OPTIONS.map((budget) => (
                  <Pressable
                    key={budget}
                    style={[
                      styles.budgetStep,
                      !isCustomBudget && giftBudget >= budget && styles.budgetStepActive,
                      !isCustomBudget && giftBudget === budget && styles.budgetStepSelected,
                    ]}
                    onPress={() => {
                      setGiftBudget(budget);
                      setCustomBudget('');
                      setIsCustomBudget(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.budgetStepText,
                        !isCustomBudget &&
                          giftBudget === budget &&
                          styles.budgetStepTextSelected,
                      ]}
                    >
                      {budget}
                    </Text>
                  </Pressable>
                ))}

                <Pressable
                  style={[
                    styles.budgetStep,
                    styles.customBudgetStep,
                    isCustomBudget && styles.budgetStepSelected,
                  ]}
                  onPress={() => setIsCustomBudget(true)}
                >
                  <Text
                    style={[
                      styles.budgetStepText,
                      isCustomBudget && styles.budgetStepTextSelected,
                    ]}
                  >
                    Alta
                  </Text>
                </Pressable>
              </View>

              {isCustomBudget && (
                <TextInput
                  placeholder="Introdu suma dorita"
                  style={styles.modalInput}
                  keyboardType="numeric"
                  value={customBudget}
                  onChangeText={(value) => {
                    setCustomBudget(value.replace(/[^0-9]/g, ''));
                    if (giftError) setGiftError('');
                  }}
                />
              )}

              <Pressable
                style={[styles.saveGiftButton, savingGift && styles.disabledButton]}
                onPress={saveGiftPlan}
                disabled={savingGift}
              >
                <Text style={styles.saveGiftButtonText}>
                  {savingGift
                    ? 'Se salveaza...'
                    : editingGiftPlan
                    ? 'Salveaza modificarile'
                    : 'Salveaza cadoul'}
                </Text>
              </Pressable>

              <Pressable style={styles.cancelGiftButton} onPress={closeGiftModal}>
                <Text style={styles.cancelGiftButtonText}>Inchide</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    color: '#6b7280',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#111827',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 18,
    alignItems: 'flex-start',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 14,
  },
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  placeholderText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#2563eb',
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  info: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 6,
  },
  notesBox: {
    marginTop: 14,
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  editButton: {
    marginTop: 18,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  giftsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 14,
  },
  newGiftButton: {
    backgroundColor: '#16a34a',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  newGiftButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  budgetSummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  budgetSummaryBox: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
  },
  budgetSummaryLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  budgetSummaryValue: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  historyButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  historyButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  historyBox: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 14,
  },
  historyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyHistoryText: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
  },
  historyItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginTop: 10,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  historyPurpose: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  historyBudget: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '800',
  },
  historyDeadline: {
    color: '#4b5563',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  historyDetails: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  historyActionButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  historyActionText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
  deleteActionButton: {
    backgroundColor: '#fee2e2',
  },
  deleteActionText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '800',
  },
  expiredText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '700',
  },
  reactionSummary: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  giftModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '88%',
    minHeight: '48%',
    paddingBottom: 16,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d1d5db',
    marginTop: 10,
    marginBottom: 6,
  },
  giftModalBody: {
    padding: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 14,
  },
  giftErrorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    marginBottom: 14,
  },
  dropdownContainer: {
    borderRadius: 12,
    borderColor: '#d1d5db',
  },
  dropdownPlaceholder: {
    color: '#9ca3af',
    fontSize: 14,
  },
  dropdownSelectedText: {
    color: '#111827',
    fontSize: 14,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  dateDropdownWrapper: {
    flex: 1,
  },
  compactDropdown: {
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    backgroundColor: '#ffffff',
  },
  modalTextArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  reactionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  reactionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionButtonSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  reactionText: {
    color: '#374151',
    fontSize: 18,
    fontWeight: '800',
  },
  reactionTextSelected: {
    color: '#ffffff',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetValue: {
    color: '#16a34a',
    fontSize: 15,
    fontWeight: '800',
  },
  budgetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
  },
  budgetStep: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customBudgetStep: {
    minWidth: 44,
  },
  budgetStepActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  budgetStepSelected: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  budgetStepText: {
    color: '#374151',
    fontSize: 11,
    fontWeight: '700',
  },
  budgetStepTextSelected: {
    color: '#ffffff',
  },
  saveGiftButton: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveGiftButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  cancelGiftButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelGiftButtonText: {
    color: '#6b7280',
    fontWeight: '700',
  },
});
