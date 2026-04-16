import React, { useEffect, useMemo, useState } from 'react';
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
import {
  getCalendarCache,
  hasCalendarCache,
  refreshCalendarCache,
} from '../../../services/calendarCache';
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

type CalendarEventType = 'buy' | 'offer' | 'completed';

type CalendarEvent = {
  id: string;
  type: CalendarEventType;
  dateKey: string;
  lovedOneId: string;
  lovedOneName: string;
  giftPlan: GiftPlan;
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
  return '#16a34a';
}

function getEventLabel(type: CalendarEventType) {
  if (type === 'buy') return 'De cumparat';
  if (type === 'offer') return 'De oferit';
  return 'Finalizat';
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
        <View style={styles.modalOverlay}>
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

export default function CalendarScreen() {
  const { token } = useAuth();
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
  const [selectedLovedOneIds, setSelectedLovedOneIds] = useState<string[]>([]);
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([]);
  const [selectedGiftTarget, setSelectedGiftTarget] = useState<{
    lovedOneId: string;
    giftPlanId: string;
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(
    toDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate())
  );

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
    return lovedOnes.flatMap((lovedOne) => {
      const giftPlans = giftPlansByLovedOne[lovedOne.id] || [];

      return giftPlans.flatMap((giftPlan) => {
        const events: CalendarEvent[] = [];
        const purchaseDeadlineDate =
          giftPlan.purchaseDeadlineDate || giftPlan.deadlineDate;

        if (purchaseDeadlineDate) {
          events.push({
            id: `${giftPlan.id}-buy`,
            type: 'buy',
            dateKey: purchaseDeadlineDate,
            lovedOneId: lovedOne.id,
            lovedOneName: lovedOne.name,
            giftPlan,
          });
        }

        if (giftPlan.deadlineDate) {
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
  }, [giftPlansByLovedOne, lovedOnes]);

  const visibleEvents = useMemo(() => {
    return allEvents.filter((event) => {
      const typeVisible =
        (event.type === 'buy' && showBuyEvents) ||
        (event.type === 'offer' && showOfferEvents) ||
        (event.type === 'completed' && showCompletedEvents);

      if (!typeVisible) return false;

      if (
        selectedLovedOneIds.length > 0 &&
        !selectedLovedOneIds.includes(event.lovedOneId)
      ) {
        return false;
      }

      if (
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
    showOfferEvents,
  ]);

  const eventsByDate = useMemo(() => {
    return visibleEvents.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
      const current = acc[event.dateKey] || [];
      acc[event.dateKey] = [...current, event].sort((a, b) =>
        a.giftPlan.purpose.localeCompare(b.giftPlan.purpose)
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
        onBack={() => setSelectedGiftTarget(null)}
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
          <Text style={styles.title}>📅 Calendar</Text>
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
          </View>
          <Pressable style={styles.refreshButton} onPress={() => load(true)}>
            <Text style={styles.refreshButtonText}>Reincarca</Text>
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
                    onPress={() =>
                      setSelectedGiftTarget({
                        lovedOneId: event.lovedOneId,
                        giftPlanId: event.giftPlan.id,
                      })
                    }
                  >
                    <Text style={[styles.eventType, { color: getEventColor(event.type) }]}>
                      {getEventLabel(event.type)}
                    </Text>
                    <Text style={styles.eventTitle}>{event.giftPlan.purpose}</Text>
                    <Text style={styles.eventPerson}>{event.lovedOneName}</Text>
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
                              onPress={() =>
                                setSelectedGiftTarget({
                                  lovedOneId: event.lovedOneId,
                                  giftPlanId: event.giftPlan.id,
                                })
                              }
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
                                {event.giftPlan.purpose}
                              </Text>
                              <Text style={styles.eventPerson} numberOfLines={1}>
                                {event.lovedOneName}
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
    backgroundColor: '#fff7ed',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 10,
    fontWeight: '500',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  title: {
    color: '#be123c',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 2,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
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
    borderWidth: 1,
    borderColor: '#fce7e0',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
  },
  legendText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  refreshButtonText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
  },
  filtersCard: {
    borderWidth: 1,
    borderColor: '#fce7e0',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    gap: 12,
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
    borderWidth: 1,
    borderColor: '#fce7e0',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: '#fff1f2',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  buyCheckbox: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  offerCheckbox: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  completedCheckbox: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  checkboxMark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  filterCheckText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
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
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  dropdownButton: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#fafafa',
  },
  dropdownButtonText: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
    fontWeight: '600',
  },
  dropdownChevron: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.4)',
    justifyContent: 'center',
    padding: 18,
  },
  dropdownModal: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
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
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownOptionText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  clearButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#6b7280',
    fontWeight: '700',
  },
  doneButton: {
    flex: 1,
    backgroundColor: '#be123c',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  calendarCard: {
    borderWidth: 1,
    borderColor: '#fce7e0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#ffffff',
    shadowColor: '#be123c',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  monthButton: {
    backgroundColor: '#fff1f2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fce7e0',
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  monthButtonText: {
    color: '#be123c',
    fontSize: 13,
    fontWeight: '700',
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  weekHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff1f2',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 9,
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#fce7e0',
  },
  agendaList: {
    gap: 10,
  },
  agendaDay: {
    borderWidth: 1,
    borderColor: '#fce7e0',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  agendaDate: {
    color: '#be123c',
    fontSize: 14,
    fontWeight: '700',
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
    backgroundColor: '#be123c',
  },
  compactDayCircleSelected: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fce7e0',
  },
  compactDayText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  compactDayTextToday: {
    color: '#ffffff',
    fontWeight: '700',
  },
  compactDayTextSelected: {
    color: '#be123c',
    fontWeight: '700',
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
    borderTopWidth: 1,
    borderTopColor: '#fce7e0',
    paddingTop: 14,
    marginTop: 8,
    gap: 8,
  },
  selectedDayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#be123c',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  dayCell: {
    width: `${100 / 7}%`,
    minHeight: 150,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#fce7e0',
    padding: 6,
    backgroundColor: '#ffffff',
  },
  emptyDayCell: {
    backgroundColor: '#fdf9f8',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  dayNumber: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  todayText: {
    color: '#be123c',
  },
  todayBadge: {
    color: '#be123c',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dayEvents: {
    gap: 5,
  },
  eventPill: {
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: '#fafafa',
  },
  eventPillHover: {
    backgroundColor: '#fff1f2',
    transform: [{ translateY: -1 }],
  },
  eventPillPressed: {
    transform: [{ scale: 0.98 }],
  },
  eventType: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  eventTitle: {
    color: '#374151',
    fontSize: 11,
    fontWeight: '600',
  },
  eventPerson: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#fce7e0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#ffffff',
  },
  summaryTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
  },
});
