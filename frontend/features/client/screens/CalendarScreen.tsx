import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { C, R, S } from '../../../constants/theme';
import {
  getCalendarCache,
  hasCalendarCache,
  refreshCalendarCache,
  subscribeCalendarCache,
} from '../../../services/calendarCache';
import { pushAppBackEntry } from '../../../services/navigationHistory';
import { getModalBackdropResponder } from '../../../utils/modalBackdrop';
import { GiftPlan, GiftPurpose } from '../../../types/giftPlans';
import { LovedOne } from '../../../types/lovedOnes';
import LovedOneDetailsScreen from './LovedOneDetailsScreen';

const PURPOSES: GiftPurpose[] = [
  'Zi de nastere',
  'Craciun',
  'Paste',
  'Zi de nume',
  'Aniversare',
  'Multumire',
  'Alta ocazie',
];

const WEEK_DAYS = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sam', 'Dum'];

type CalendarEventType =
  | 'buy'
  | 'offer'
  | 'completed'
  | 'lovedBirthday'
  | 'userBirthday'
  | 'easter'
  | 'christmas';

type CalendarEvent = {
  id: string;
  type: CalendarEventType;
  dateKey: string;
  lovedOneId?: string;
  lovedOneName?: string;
  giftPlan?: GiftPlan;
  title?: string;
  description?: string;
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function dateKeyFromIso(dateValue?: string) {
  if (!dateValue) return null;

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return toDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function formatDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-');
  return `${day}.${month}.${year}`;
}

function getMonthName(monthIndex: number) {
  return new Date(2026, monthIndex, 1).toLocaleString('ro-RO', {
    month: 'long',
  });
}

function getCalendarDays(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const cells: Array<number | null> = [];

  for (let i = 0; i < mondayOffset; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function getEventColor(type: CalendarEventType) {
  if (type === 'buy') return '#2563eb';
  if (type === 'offer') return '#0f766e';
  if (type === 'completed') return '#16a34a';
  if (type === 'lovedBirthday') return '#be123c';
  if (type === 'userBirthday') return '#f97316';
  if (type === 'easter') return '#7c3aed';
  return '#dc2626';
}

function getEventLabel(type: CalendarEventType) {
  if (type === 'buy') return 'De cumparat';
  if (type === 'offer') return 'De oferit';
  if (type === 'completed') return 'Finalizat';
  if (type === 'lovedBirthday') return 'Zi de nastere';
  if (type === 'userBirthday') return 'Ziua ta';
  if (type === 'easter') return 'Paste';
  return 'Craciun';
}

function getEventTitle(event: CalendarEvent) {
  return event.giftPlan?.purpose || event.title || getEventLabel(event.type);
}

function getEventPerson(event: CalendarEvent) {
  return event.lovedOneName || event.description || '';
}

function getOrthodoxEasterDateKey(year: number) {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const julianMonth = Math.floor((d + e + 114) / 31);
  const julianDay = ((d + e + 114) % 31) + 1;
  const date = new Date(year, julianMonth - 1, julianDay);

  date.setDate(date.getDate() + 13);

  return toDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function dateKeyFromBirthDate(birthDate: string | undefined, targetYear: number) {
  if (!birthDate) return null;

  const [birthYear, month, day] = birthDate.split('-').map(Number);
  const date = new Date(targetYear, month - 1, day);

  if (
    !birthYear ||
    !month ||
    !day ||
    date.getFullYear() !== targetYear ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return toDateKey(targetYear, month, day);
}

function formatSelectedDay(dateKey: string) {
  const [yr, mo, dy] = dateKey.split('-').map(Number);
  const date = new Date(yr, mo - 1, dy);
  return date.toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function MultiSelectDropdown({
  label,
  placeholder,
  options,
  selectedValues,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: { label: string; value: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}) {
  const [visible, setVisible] = useState(false);
  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((item) => item !== value));
      return;
    }

    onChange([...selectedValues, value]);
  };

  return (
    <View style={styles.dropdownBlock}>
      <Text style={styles.filterLabel}>{label}</Text>
      <Pressable style={styles.dropdownButton} onPress={() => setVisible(true)}>
        <Text style={styles.dropdownButtonText}>
          {selectedLabels.length > 0
            ? selectedLabels.join(', ')
            : placeholder}
        </Text>
        <Text style={styles.dropdownChevron}>v</Text>
      </Pressable>

      <Modal
        visible={visible}
        animationType="fade"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <View
          style={styles.modalOverlay}
          {...getModalBackdropResponder(() => setVisible(false))}
        >
          <View style={styles.dropdownModal}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView style={styles.dropdownList}>
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.value);

                return (
                  <Pressable
                    key={option.value}
                    style={styles.dropdownOption}
                    onPress={() => toggleValue(option.value)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxActive,
                      ]}
                    >
                      {isSelected && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
                    <Text style={styles.dropdownOptionText}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.dropdownActions}>
              <Pressable
                style={styles.clearButton}
                onPress={() => onChange([])}
              >
                <Text style={styles.clearButtonText}>Curata</Text>
              </Pressable>
              <Pressable
                style={styles.doneButton}
                onPress={() => setVisible(false)}
              >
                <Text style={styles.doneButtonText}>Gata</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type Props = {
  resetRef?: React.MutableRefObject<(() => void) | null>;
};

export default function CalendarScreen({ resetRef }: Props) {
  const { token, profile } = useAuth();
  const { width } = useWindowDimensions();
  const today = new Date();
  const isCompact = width < 760;
  const [loading, setLoading] = useState(true);
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([]);
  const [giftPlansByLovedOne, setGiftPlansByLovedOne] = useState<
    Record<string, GiftPlan[]>
  >({});
  const [monthIndex, setMonthIndex] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [showBuyEvents, setShowBuyEvents] = useState(true);
  const [showOfferEvents, setShowOfferEvents] = useState(true);
  const [showCompletedEvents, setShowCompletedEvents] = useState(true);
  const [showLovedOneBirthdays, setShowLovedOneBirthdays] = useState(true);
  const [showUserBirthday, setShowUserBirthday] = useState(true);
  const [showHolidays, setShowHolidays] = useState(true);
  const [showEaster, setShowEaster] = useState(true);
  const [showChristmas, setShowChristmas] = useState(true);
  const [selectedLovedOneIds, setSelectedLovedOneIds] = useState<string[]>([]);
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([]);
  const [selectedGiftTarget, setSelectedGiftTarget] = useState<{
    lovedOneId: string;
    giftPlanId: string;
  } | null>(null);
  const selectedGiftBackRef = useRef<ReturnType<typeof pushAppBackEntry> | null>(
    null
  );
  const [selectedDay, setSelectedDay] = useState<string>(
    toDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate())
  );

  useEffect(() => {
    if (!resetRef) return;

    const resetHandler = () => {
      setSelectedGiftTarget(null);
    };

    resetRef.current = resetHandler;

    return () => {
      if (resetRef.current === resetHandler) {
        resetRef.current = null;
      }
    };
  }, [resetRef]);

  const load = async (forceRefresh = false) => {
    try {
      if (!token) return;

      setLoading(forceRefresh || !hasCalendarCache(token));
      const calendarData = forceRefresh
        ? await refreshCalendarCache(token)
        : await getCalendarCache(token);

      setLovedOnes(calendarData.lovedOnes);
      setGiftPlansByLovedOne(calendarData.giftPlansByLovedOne);
    } catch (error) {
      console.error('LOAD CALENDAR ERROR:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  useEffect(() => {
    return subscribeCalendarCache(() => {
      load(true);
    });
  }, [token]);

  useEffect(() => {
    if (!selectedGiftTarget) return;

    const entry = pushAppBackEntry(() => setSelectedGiftTarget(null));
    selectedGiftBackRef.current = entry;

    return () => {
      entry.remove();
      if (selectedGiftBackRef.current === entry) {
        selectedGiftBackRef.current = null;
      }
    };
  }, [selectedGiftTarget]);

  const goBackFromGiftDetails = () => {
    if (selectedGiftBackRef.current?.goBack()) return;

    setSelectedGiftTarget(null);
  };

  const lovedOneOptions = useMemo(
    () =>
      lovedOnes.map((lovedOne) => ({
        label: lovedOne.name,
        value: lovedOne.id,
      })),
    [lovedOnes]
  );

  const purposeOptions = useMemo(
    () => PURPOSES.map((purpose) => ({ label: purpose, value: purpose })),
    []
  );

  const allEvents = useMemo(() => {
    const giftEvents = lovedOnes.flatMap((lovedOne) => {
      const giftPlans = giftPlansByLovedOne[lovedOne.id] || [];

      return giftPlans.flatMap((giftPlan) => {
        const events: CalendarEvent[] = [];
        const purchaseDeadlineDate =
          giftPlan.purchaseDeadlineDate || giftPlan.deadlineDate;

        if (giftPlan.status === 'planned' && purchaseDeadlineDate) {
          events.push({
            id: `${giftPlan.id}-buy`,
            type: 'buy',
            dateKey: purchaseDeadlineDate,
            lovedOneId: lovedOne.id,
            lovedOneName: lovedOne.name,
            giftPlan,
          });
        }

        if (giftPlan.status !== 'completed' && giftPlan.deadlineDate) {
          events.push({
            id: `${giftPlan.id}-offer`,
            type: 'offer',
            dateKey: giftPlan.deadlineDate,
            lovedOneId: lovedOne.id,
            lovedOneName: lovedOne.name,
            giftPlan,
          });
        }

        const completedDateKey = dateKeyFromIso(giftPlan.offeredAt);

        if (giftPlan.status === 'completed' && completedDateKey) {
          events.push({
            id: `${giftPlan.id}-completed`,
            type: 'completed',
            dateKey: completedDateKey,
            lovedOneId: lovedOne.id,
            lovedOneName: lovedOne.name,
            giftPlan,
          });
        }

        return events;
      });
    });

    const lovedBirthdayEvents: CalendarEvent[] = lovedOnes
      .map((lovedOne) => {
        const dateKey = toDateKey(year, lovedOne.month, lovedOne.day);

        return {
          id: `${lovedOne.id}-birthday-${year}`,
          type: 'lovedBirthday' as const,
          dateKey,
          lovedOneId: lovedOne.id,
          lovedOneName: lovedOne.name,
          title: `Ziua lui ${lovedOne.name}`,
          description: lovedOne.year
            ? `${year - lovedOne.year} ani`
            : 'Persoana draga',
        };
      });

    const userBirthdayDateKey = dateKeyFromBirthDate(profile?.birthDate, year);
    const userBirthdayEvent: CalendarEvent[] =
      userBirthdayDateKey && profile
        ? [
            {
              id: `${profile.uid}-birthday-${year}`,
              type: 'userBirthday',
              dateKey: userBirthdayDateKey,
              title: 'Ziua ta de nastere',
              description: `${profile.firstName} ${profile.lastName}`,
            },
          ]
        : [];

    const holidayEvents: CalendarEvent[] = [
      {
        id: `easter-${year}`,
        type: 'easter',
        dateKey: getOrthodoxEasterDateKey(year),
        title: 'Paste',
        description: 'Sarbatoare',
      },
      {
        id: `christmas-${year}`,
        type: 'christmas',
        dateKey: toDateKey(year, 12, 25),
        title: 'Craciun',
        description: 'Sarbatoare',
      },
    ];

    return [
      ...giftEvents,
      ...lovedBirthdayEvents,
      ...userBirthdayEvent,
      ...holidayEvents,
    ];
  }, [giftPlansByLovedOne, lovedOnes, profile, year]);

  const visibleEvents = useMemo(() => {
    return allEvents.filter((event) => {
      const typeVisible =
        (event.type === 'buy' && showBuyEvents) ||
        (event.type === 'offer' && showOfferEvents) ||
        (event.type === 'completed' && showCompletedEvents) ||
        (event.type === 'lovedBirthday' && showLovedOneBirthdays) ||
        (event.type === 'userBirthday' && showUserBirthday) ||
        ((event.type === 'easter' || event.type === 'christmas') &&
          showHolidays);

      if (!typeVisible) return false;

      if (
        selectedLovedOneIds.length > 0 &&
        event.lovedOneId &&
        !selectedLovedOneIds.includes(event.lovedOneId)
      ) {
        return false;
      }

      if (
        event.giftPlan &&
        selectedPurposes.length > 0 &&
        !selectedPurposes.includes(event.giftPlan.purpose)
      ) {
        return false;
      }

      return true;
    });
  }, [
    allEvents,
    selectedLovedOneIds,
    selectedPurposes,
    showBuyEvents,
    showCompletedEvents,
    showHolidays,
    showLovedOneBirthdays,
    showOfferEvents,
    showUserBirthday,
  ]);

  const eventsByDate = useMemo(() => {
    return visibleEvents.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
      const current = acc[event.dateKey] || [];
      acc[event.dateKey] = [...current, event].sort((a, b) =>
        getEventTitle(a).localeCompare(getEventTitle(b))
      );
      return acc;
    }, {});
  }, [visibleEvents]);

  const monthDays = useMemo(
    () => getCalendarDays(year, monthIndex),
    [monthIndex, year]
  );
  const monthAgendaDays = useMemo(() => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const dateKey = toDateKey(year, monthIndex + 1, day);

      return {
        day,
        dateKey,
        events: eventsByDate[dateKey] || [],
      };
    }).filter((item) => item.events.length > 0);
  }, [eventsByDate, monthIndex, year]);

  const goToPreviousMonth = () => {
    if (monthIndex === 0) {
      setMonthIndex(11);
      setYear((current) => current - 1);
      return;
    }

    setMonthIndex((current) => current - 1);
  };

  const goToNextMonth = () => {
    if (monthIndex === 11) {
      setMonthIndex(0);
      setYear((current) => current + 1);
      return;
    }

    setMonthIndex((current) => current + 1);
  };

  if (selectedGiftTarget) {
    return (
      <LovedOneDetailsScreen
        lovedOneId={selectedGiftTarget.lovedOneId}
        initialGiftPlanId={selectedGiftTarget.giftPlanId}
        backLabel="Inapoi la calendar"
        onBack={goBackFromGiftDetails}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Se incarca calendarul...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Calendar</Text>
          <Text style={styles.subtitle}>
            Urmareste cadourile pe zile, luni si ani.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
              <Text style={styles.legendText}>De cumparat</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0f766e' }]} />
              <Text style={styles.legendText}>De oferit</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} />
              <Text style={styles.legendText}>Finalizate</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#be123c' }]} />
              <Text style={styles.legendText}>Zile nastere</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#7c3aed' }]} />
              <Text style={styles.legendText}>Sarbatori</Text>
            </View>
          </View>
          <Pressable style={styles.refreshButton} onPress={() => load(true)}>
            <Text style={styles.refreshButtonText}>Reincarca</Text>
          </Pressable>

          <Pressable
            style={styles.filterCheck}
            onPress={() => setShowLovedOneBirthdays((current) => !current)}
          >
            <View
              style={[
                styles.checkbox,
                showLovedOneBirthdays && styles.birthdayCheckbox,
              ]}
            >
              {showLovedOneBirthdays && (
                <Text style={styles.checkboxMark}>✓</Text>
              )}
            </View>
            <Text style={styles.filterCheckText}>Zile nastere persoane</Text>
          </Pressable>

          <Pressable
            style={styles.filterCheck}
            onPress={() => setShowUserBirthday((current) => !current)}
          >
            <View
              style={[
                styles.checkbox,
                showUserBirthday && styles.userBirthdayCheckbox,
              ]}
            >
              {showUserBirthday && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.filterCheckText}>Ziua mea</Text>
          </Pressable>

          <Pressable
            style={styles.filterCheck}
            onPress={() => setShowEaster((current) => !current)}
          >
            <View style={[styles.checkbox, showEaster && styles.easterCheckbox]}>
              {showEaster && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.filterCheckText}>Paste</Text>
          </Pressable>

          <Pressable
            style={styles.filterCheck}
            onPress={() => setShowChristmas((current) => !current)}
          >
            <View
              style={[styles.checkbox, showChristmas && styles.christmasCheckbox]}
            >
              {showChristmas && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.filterCheckText}>Craciun</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.filtersCard}>
        <View style={styles.checkboxRow}>
          <Pressable
            style={styles.filterCheck}
            onPress={() => setShowBuyEvents((current) => !current)}
          >
            <View
              style={[styles.checkbox, showBuyEvents && styles.buyCheckbox]}
            >
              {showBuyEvents && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.filterCheckText}>Cadouri - de cumparat</Text>
          </Pressable>

          <Pressable
            style={styles.filterCheck}
            onPress={() => setShowOfferEvents((current) => !current)}
          >
            <View
              style={[styles.checkbox, showOfferEvents && styles.offerCheckbox]}
            >
              {showOfferEvents && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.filterCheckText}>Cadouri - de oferit</Text>
          </Pressable>

          <Pressable
            style={styles.filterCheck}
            onPress={() => setShowCompletedEvents((current) => !current)}
          >
            <View
              style={[
                styles.checkbox,
                showCompletedEvents && styles.completedCheckbox,
              ]}
            >
              {showCompletedEvents && (
                <Text style={styles.checkboxMark}>✓</Text>
              )}
            </View>
            <Text style={styles.filterCheckText}>Cadouri - finalizate</Text>
          </Pressable>

          <Pressable
            style={styles.filterCheck}
            onPress={() => setShowLovedOneBirthdays((current) => !current)}
          >
            <View
              style={[
                styles.checkbox,
                showLovedOneBirthdays && styles.birthdayCheckbox,
              ]}
            >
              {showLovedOneBirthdays && (
                <Text style={styles.checkboxMark}>✓</Text>
              )}
            </View>
            <Text style={styles.filterCheckText}>Zile nastere persoane</Text>
          </Pressable>

          <Pressable
            style={styles.filterCheck}
            onPress={() => setShowUserBirthday((current) => !current)}
          >
            <View
              style={[
                styles.checkbox,
                showUserBirthday && styles.userBirthdayCheckbox,
              ]}
            >
              {showUserBirthday && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.filterCheckText}>Ziua mea</Text>
          </Pressable>

          <Pressable
            style={styles.filterCheck}
            onPress={() => setShowHolidays((current) => !current)}
          >
            <View style={[styles.checkbox, showHolidays && styles.holidayCheckbox]}>
              {showHolidays && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.filterCheckText}>Sarbatori</Text>
          </Pressable>
        </View>

        <View style={[styles.dropdownRow, isCompact && styles.dropdownRowCompact]}>
          <MultiSelectDropdown
            label="Persoane dragi"
            placeholder="Toate persoanele"
            options={lovedOneOptions}
            selectedValues={selectedLovedOneIds}
            onChange={setSelectedLovedOneIds}
          />
          <MultiSelectDropdown
            label="Scopuri cadouri"
            placeholder="Toate scopurile"
            options={purposeOptions}
            selectedValues={selectedPurposes}
            onChange={setSelectedPurposes}
          />
        </View>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Pressable style={styles.monthButton} onPress={goToPreviousMonth}>
            <Text style={styles.monthButtonText}>Inapoi</Text>
          </Pressable>
          <Text style={styles.monthTitle}>
            {getMonthName(monthIndex)} {year}
          </Text>
          <Pressable style={styles.monthButton} onPress={goToNextMonth}>
            <Text style={styles.monthButtonText}>Inainte</Text>
          </Pressable>
        </View>

        {isCompact ? (
          <>
            <View style={styles.weekHeader}>
              {WEEK_DAYS.map((day) => (
                <Text key={day} style={styles.weekDay}>{day}</Text>
              ))}
            </View>

            <View style={styles.compactGrid}>
              {monthDays.map((day, index) => {
                const dateKey = day ? toDateKey(year, monthIndex + 1, day) : '';
                const dayEvents = dateKey ? eventsByDate[dateKey] || [] : [];
                const isToday =
                  day !== null &&
                  dateKey === toDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
                const isSelected = dateKey === selectedDay;

                return (
                  <Pressable
                    key={`${dateKey || 'empty'}-${index}`}
                    style={styles.compactDayCell}
                    onPress={() => day && setSelectedDay(dateKey)}
                  >
                    {day && (
                      <>
                        <View
                          style={[
                            styles.compactDayCircle,
                            isToday && styles.compactDayCircleToday,
                            isSelected && !isToday && styles.compactDayCircleSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.compactDayText,
                              isToday && styles.compactDayTextToday,
                              isSelected && !isToday && styles.compactDayTextSelected,
                            ]}
                          >
                            {day}
                          </Text>
                        </View>
                        {dayEvents.length > 0 && (
                          <View style={styles.eventDots}>
                            {dayEvents.slice(0, 3).map((event, i) => (
                              <View
                                key={i}
                                style={[
                                  styles.eventDot,
                                  { backgroundColor: getEventColor(event.type) },
                                ]}
                              />
                            ))}
                          </View>
                        )}
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.selectedDayPanel}>
              <Text style={styles.selectedDayTitle}>
                {formatSelectedDay(selectedDay)}
              </Text>
              {(eventsByDate[selectedDay] || []).length === 0 ? (
                <Text style={styles.emptyText}>
                  Nu sunt cadouri pentru aceasta zi.
                </Text>
              ) : (
                (eventsByDate[selectedDay] || []).map((event) => (
                  <Pressable
                    key={event.id}
                    style={({ hovered, pressed }) => [
                      styles.eventPill,
                      styles.agendaEvent,
                      hovered && styles.eventPillHover,
                      pressed && styles.eventPillPressed,
                      { borderLeftColor: getEventColor(event.type) },
                    ]}
                    onPress={() => {
                      if (!event.giftPlan || !event.lovedOneId) return;

                      setSelectedGiftTarget({
                        lovedOneId: event.lovedOneId,
                        giftPlanId: event.giftPlan.id,
                      });
                    }}
                    disabled={!event.giftPlan || !event.lovedOneId}
                  >
                    <Text style={[styles.eventType, { color: getEventColor(event.type) }]}>
                      {getEventLabel(event.type)}
                    </Text>
                    <Text style={styles.eventTitle}>{getEventTitle(event)}</Text>
                    <Text style={styles.eventPerson}>{getEventPerson(event)}</Text>
                  </Pressable>
                ))
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.weekHeader}>
              {WEEK_DAYS.map((day) => (
                <Text key={day} style={styles.weekDay}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {monthDays.map((day, index) => {
                const dateKey = day ? toDateKey(year, monthIndex + 1, day) : '';
                const dayEvents = dateKey ? eventsByDate[dateKey] || [] : [];
                const isToday =
                  day !== null &&
                  dateKey ===
                    toDateKey(
                      today.getFullYear(),
                      today.getMonth() + 1,
                      today.getDate()
                    );

                return (
                  <View
                    key={`${dateKey || 'empty'}-${index}`}
                    style={[styles.dayCell, !day && styles.emptyDayCell]}
                  >
                    {day && (
                      <>
                        <View style={styles.dayHeader}>
                          <Text style={[styles.dayNumber, isToday && styles.todayText]}>
                            {day}
                          </Text>
                          {isToday && <Text style={styles.todayBadge}>azi</Text>}
                        </View>

                        <View style={styles.dayEvents}>
                          {dayEvents.map((event) => (
                            <Pressable
                              key={event.id}
                              style={({ hovered, pressed }) => [
                                styles.eventPill,
                                hovered && styles.eventPillHover,
                                pressed && styles.eventPillPressed,
                                { borderLeftColor: getEventColor(event.type) },
                              ]}
                              onPress={() => {
                                if (!event.giftPlan || !event.lovedOneId) return;

                                setSelectedGiftTarget({
                                  lovedOneId: event.lovedOneId,
                                  giftPlanId: event.giftPlan.id,
                                });
                              }}
                              disabled={!event.giftPlan || !event.lovedOneId}
                            >
                              <Text
                                style={[
                                  styles.eventType,
                                  { color: getEventColor(event.type) },
                                ]}
                              >
                                {getEventLabel(event.type)}
                              </Text>
                              <Text style={styles.eventTitle} numberOfLines={1}>
                                {getEventTitle(event)}
                              </Text>
                              <Text style={styles.eventPerson} numberOfLines={1}>
                                {getEventPerson(event)}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Evenimente vizibile</Text>
        <Text style={styles.summaryText}>
          {visibleEvents.length} intrari in calendar pentru filtrele curente.
        </Text>
        {visibleEvents.length === 0 && (
          <Text style={styles.emptyText}>
            Nu exista cadouri pentru luna si filtrele selectate.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
    backgroundColor: C.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: C.textFaint,
    marginTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  title: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '400',
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subtitle: {
    color: C.textDim,
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
    display: 'none',
    alignItems: 'flex-end',
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: C.surface,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
  },
  legendText: {
    color: C.textDim,
    fontSize: 12,
  },
  refreshButton: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: C.surface,
  },
  refreshButtonText: {
    color: C.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
  filtersCard: {
    borderWidth: 0.5,
    borderColor: C.border,
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: 14,
    gap: 12,
    ...S.card,
  },
  checkboxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: C.surface2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: C.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
  checkboxActive: {
    backgroundColor: C.text,
    borderColor: C.text,
  },
  buyCheckbox: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  offerCheckbox: {
    backgroundColor: C.sage,
    borderColor: C.sage,
  },
  completedCheckbox: {
    backgroundColor: C.sage,
    borderColor: C.sage,
  },
  birthdayCheckbox: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  userBirthdayCheckbox: {
    backgroundColor: C.warn,
    borderColor: C.warn,
  },
  easterCheckbox: {
    backgroundColor: C.warn,
    borderColor: C.warn,
  },
  holidayCheckbox: {
    backgroundColor: C.textDim,
    borderColor: C.textDim,
  },
  christmasCheckbox: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  checkboxMark: {
    color: C.accentInk,
    fontSize: 12,
    fontWeight: '700',
  },
  filterCheckText: {
    color: C.textDim,
    fontSize: 13,
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dropdownRowCompact: {
    flexDirection: 'column',
  },
  dropdownBlock: {
    flex: 1,
    minWidth: 0,
  },
  filterLabel: {
    color: C.textDim,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  dropdownButton: {
    minHeight: 46,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: C.surface2,
  },
  dropdownButtonText: {
    flex: 1,
    color: C.text,
    fontSize: 13,
  },
  dropdownChevron: {
    color: C.textFaint,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31,27,22,0.4)',
    justifyContent: 'center',
    padding: 18,
  },
  dropdownModal: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontFamily: 'serif',
    color: C.text,
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 12,
  },
  dropdownList: {
    maxHeight: 360,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  dropdownOptionText: {
    color: C.textDim,
    fontSize: 14,
  },
  dropdownActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  clearButton: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  clearButtonText: {
    color: C.textDim,
    fontWeight: '600',
  },
  doneButton: {
    flex: 1,
    backgroundColor: C.accent,
    borderRadius: R.md,
    paddingVertical: 11,
    alignItems: 'center',
  },
  doneButtonText: {
    color: C.accentInk,
    fontWeight: '600',
  },
  calendarCard: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.xl,
    padding: 14,
    backgroundColor: C.surface,
    ...S.card,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  monthButton: {
    backgroundColor: C.accentSoft,
    borderRadius: R.md,
    borderWidth: 0.5,
    borderColor: C.border,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  monthButtonText: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'serif',
    color: C.text,
    fontSize: 22,
    fontWeight: '400',
    textTransform: 'capitalize',
    letterSpacing: -0.3,
  },
  weekHeader: {
    flexDirection: 'row',
    backgroundColor: C.surface2,
    borderRadius: R.sm,
    overflow: 'hidden',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    color: C.textFaint,
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 9,
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderColor: C.border,
  },
  agendaList: {
    gap: 10,
  },
  agendaDay: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    padding: 12,
    backgroundColor: C.surface,
  },
  agendaDate: {
    color: C.accent,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  agendaEvent: {
    marginBottom: 8,
  },
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  compactDayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center' as const,
    paddingVertical: 5,
  },
  compactDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactDayCircleToday: {
    backgroundColor: C.accent,
  },
  compactDayCircleSelected: {
    backgroundColor: C.accentSoft,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  compactDayText: {
    fontSize: 15,
    fontWeight: '500',
    color: C.textDim,
  },
  compactDayTextToday: {
    color: C.accentInk,
    fontWeight: '600',
  },
  compactDayTextSelected: {
    color: C.accent,
    fontWeight: '600',
  },
  eventDots: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 3,
    justifyContent: 'center',
    minHeight: 7,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  selectedDayPanel: {
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 14,
    marginTop: 8,
    gap: 8,
  },
  selectedDayTitle: {
    fontFamily: 'serif',
    fontSize: 15,
    fontWeight: '400',
    color: C.accent,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  dayCell: {
    width: `${100 / 7}%`,
    minHeight: 150,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: C.border,
    padding: 6,
    backgroundColor: C.surface,
  },
  emptyDayCell: {
    backgroundColor: C.bg,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  dayNumber: {
    color: C.textDim,
    fontSize: 13,
    fontWeight: '500',
  },
  todayText: {
    color: C.accent,
    fontWeight: '700',
  },
  todayBadge: {
    color: C.accent,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dayEvents: {
    gap: 5,
  },
  eventPill: {
    borderLeftWidth: 3,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.xs,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: C.surface2,
  },
  eventPillHover: {
    backgroundColor: C.accentSoft,
    transform: [{ translateY: -1 }],
  },
  eventPillPressed: {
    transform: [{ scale: 0.98 }],
  },
  eventType: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  eventTitle: {
    color: C.textDim,
    fontSize: 11,
    fontWeight: '500',
  },
  eventPerson: {
    color: C.textFaint,
    fontSize: 10,
    marginTop: 1,
  },
  summaryCard: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.xl,
    padding: 14,
    backgroundColor: C.surface,
    ...S.card,
  },
  summaryTitle: {
    fontFamily: 'serif',
    color: C.text,
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 4,
  },
  summaryText: {
    color: C.textDim,
    fontSize: 13,
  },
  emptyText: {
    color: C.textFaint,
    fontSize: 13,
    marginTop: 8,
  },
});
