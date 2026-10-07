import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Dropdown } from 'react-native-element-dropdown';
import { useAuth } from '../../../context/AuthContext';
import {
  getMaintenanceAdminState,
  startImmediateMaintenance,
  scheduleMaintenance,
  stopMaintenance,
  MaintenanceAdminState,
} from '../../../services/maintenanceApi';
import { getModalBackdropResponder } from '../../../utils/modalBackdrop';
import { C, R, S } from '../../../constants/theme';
import AdminFooter from '../components/AdminFooter';

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

const MIN_LEAD_MS = 60 * 60 * 1000;

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  label: String(i).padStart(2, '0'),
  value: i,
}));

const MINUTES = Array.from({ length: 12 }, (_, i) => ({
  label: String(i * 5).padStart(2, '0'),
  value: i * 5,
}));

function getYearOptions() {
  const year = new Date().getFullYear();
  return [year, year + 1].map((y) => ({ label: String(y), value: y }));
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatRo(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type DateParts = { year: number; month: number; day: number; hour: number; minute: number };

function partsFromDate(date: Date): DateParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: Math.round(date.getMinutes() / 5) * 5 % 60,
  };
}

function partsFromIso(iso: string): DateParts {
  return partsFromDate(new Date(iso));
}

function partsToIso(p: DateParts) {
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, 0, 0).toISOString();
}

export default function MaintenanceScreen() {
  const { token } = useAuth();
  const [state, setState] = useState<MaintenanceAdminState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [immediateMessage, setImmediateMessage] = useState('');
  const [immediateSaving, setImmediateSaving] = useState(false);
  const [confirmImmediateVisible, setConfirmImmediateVisible] = useState(false);

  // Defaults sit comfortably past the 1h minimum lead time (below), so 5-minute
  // dropdown rounding can never accidentally land them under the limit.
  const [start, setStart] = useState<DateParts>(() => partsFromDate(new Date(Date.now() + 75 * 60000)));
  const [end, setEnd] = useState<DateParts>(() => partsFromDate(new Date(Date.now() + 135 * 60000)));
  const [scheduleMessage, setScheduleMessage] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const [stopping, setStopping] = useState(false);

  const seededRef = useRef(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError('');
      const data = await getMaintenanceAdminState(token);
      setState(data);
    } catch {
      setError('Nu am putut încărca starea de mentenanță.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Prefill the schedule form from whatever's already stored, once, so editing an
  // upcoming/active window starts from its real values instead of blank defaults.
  useEffect(() => {
    if (seededRef.current || !state) return;
    if (state.mode === 'scheduled' && state.scheduledStart && state.scheduledEnd) {
      setStart(partsFromIso(state.scheduledStart));
      setEnd(partsFromIso(state.scheduledEnd));
      setScheduleMessage(state.message || '');
    }
    if (state.mode === 'immediate') {
      setImmediateMessage(state.message || '');
    }
    seededRef.current = true;
  }, [state]);

  const phase = state?.effective.phase ?? 'off';
  const isImmediateActive = state?.mode === 'immediate';
  const isScheduleLive = state?.mode === 'scheduled' && (phase === 'upcoming' || phase === 'active');

  const confirmStartImmediate = async () => {
    if (!token) return;
    setImmediateSaving(true);
    setError('');
    try {
      await startImmediateMaintenance(token, immediateMessage);
      setConfirmImmediateVisible(false);
      await load();
    } catch {
      setError('Nu am putut activa mentenanța.');
    } finally {
      setImmediateSaving(false);
    }
  };

  const handleStop = () => {
    if (!token) return;
    setStopping(true);
    setError('');
    stopMaintenance(token)
      .then(load)
      .catch(() => setError('Nu am putut opri mentenanța.'))
      .finally(() => setStopping(false));
  };

  const handleSchedule = async () => {
    if (!token) return;

    const startIso = partsToIso(start);
    const endIso = partsToIso(end);
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();

    if (startMs < Date.now() + MIN_LEAD_MS) {
      setError('Data de început trebuie să fie în viitor, cu cel puțin o oră în avans.');
      return;
    }

    if (endMs <= startMs) {
      setError('Data de sfârșit trebuie să fie după data de început.');
      return;
    }

    setScheduleSaving(true);
    setError('');
    try {
      await scheduleMaintenance(token, startIso, endIso, scheduleMessage);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Nu am putut programa mentenanța.');
    } finally {
      setScheduleSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBlock}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Se încarcă...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Mentenanță</Text>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {(isImmediateActive || isScheduleLive) && (
        <View style={[styles.card, styles.statusCard]}>
          <Text style={styles.cardTitle}>
            {isImmediateActive
              ? '🛠️ Mentenanță imediată — activă'
              : phase === 'active'
              ? '🛠️ Mentenanță programată — în curs'
              : '⏳ Mentenanță programată — urmează'}
          </Text>
          {state?.mode === 'scheduled' && (
            <Text style={styles.statusText}>
              {formatRo(state.scheduledStart)} – {formatRo(state.scheduledEnd)}
            </Text>
          )}
          {!!state?.message && <Text style={styles.statusText}>Mesaj: {state.message}</Text>}
          <Pressable
            style={[styles.stopButton, stopping && styles.disabledButton]}
            onPress={handleStop}
            disabled={stopping}
          >
            <Text style={styles.stopButtonText}>
              {stopping ? 'Se oprește...' : 'Oprește mentenanța'}
            </Text>
          </Pressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mentenanță imediată</Text>
        <Text style={styles.hint}>
          Blochează instant toată aplicația pentru toți utilizatorii — inclusiv cei deja
          conectați — în afară de admin, până o oprești manual.
        </Text>
        <TextInput
          style={styles.messageInput}
          placeholder="Mesaj afișat utilizatorilor (opțional)"
          placeholderTextColor={C.textFaint}
          value={immediateMessage}
          onChangeText={setImmediateMessage}
          multiline
        />
        <Pressable
          style={[
            styles.dangerButton,
            (immediateSaving || isImmediateActive) && styles.disabledButton,
          ]}
          onPress={() => setConfirmImmediateVisible(true)}
          disabled={immediateSaving || isImmediateActive}
        >
          <Text style={styles.dangerButtonText}>
            {isImmediateActive
              ? 'Mentenanță activă'
              : immediateSaving
              ? 'Se activează...'
              : 'Activează mentenanța imediată'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mentenanță programată</Text>
        <Text style={styles.hint}>
          Utilizatorii văd din timp un anunț discret. Aplicația se blochează automat la ora
          de început și se deblochează automat la ora de sfârșit — poți opri mai devreme sau
          modifica intervalul oricând, chiar și în timp ce e deja în curs. Data de început
          trebuie să fie în viitor, cu cel puțin o oră în avans.
        </Text>

        <Text style={styles.label}>Început</Text>
        <DateTimeFields value={start} onChange={setStart} />

        <Text style={styles.label}>Sfârșit</Text>
        <DateTimeFields value={end} onChange={setEnd} />

        <TextInput
          style={styles.messageInput}
          placeholder="Mesaj afișat utilizatorilor (opțional)"
          placeholderTextColor={C.textFaint}
          value={scheduleMessage}
          onChangeText={setScheduleMessage}
          multiline
        />

        <Pressable
          style={[styles.saveButton, scheduleSaving && styles.disabledButton]}
          onPress={handleSchedule}
          disabled={scheduleSaving}
        >
          <Text style={styles.saveButtonText}>
            {scheduleSaving
              ? 'Se salvează...'
              : isScheduleLive
              ? 'Actualizează programarea'
              : 'Programează mentenanța'}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={confirmImmediateVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setConfirmImmediateVisible(false)}
      >
        <View
          style={styles.modalOverlay}
          {...getModalBackdropResponder(() => setConfirmImmediateVisible(false))}
        >
          <View style={styles.confirmModalCard}>
            <Text style={styles.modalTitle}>Activezi mentenanța imediată?</Text>
            <Text style={styles.confirmText}>
              Toți utilizatorii, în afară de admin, vor fi blocați instant din aplicație,
              chiar dacă sunt deja conectați — până o oprești manual.
            </Text>

            <Pressable
              style={[styles.dangerButton, immediateSaving && styles.disabledButton]}
              onPress={confirmStartImmediate}
              disabled={immediateSaving}
            >
              <Text style={styles.dangerButtonText}>
                {immediateSaving ? 'Se activează...' : 'Activează'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setConfirmImmediateVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Anulează</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <AdminFooter />
    </ScrollView>
  );
}

type DateTimeFieldsProps = {
  value: DateParts;
  onChange: (parts: DateParts) => void;
};

function DateTimeFields({ value, onChange }: DateTimeFieldsProps) {
  const years = useMemo(() => getYearOptions(), []);
  const maxDays = getDaysInMonth(value.year, value.month);
  const days = useMemo(
    () =>
      Array.from({ length: maxDays }, (_, i) => ({
        label: String(i + 1).padStart(2, '0'),
        value: i + 1,
      })),
    [maxDays]
  );

  return (
    <View style={styles.dateTimeRow}>
      <Dropdown
        style={[styles.dtDropdown]}
        containerStyle={styles.dropdownContainer}
        placeholderStyle={styles.dropdownPlaceholder}
        selectedTextStyle={styles.dropdownSelectedText}
        data={days}
        labelField="label"
        valueField="value"
        placeholder="Zi"
        value={Math.min(value.day, maxDays)}
        onChange={(item) => onChange({ ...value, day: item.value })}
      />
      <Dropdown
        style={[styles.dtDropdown, styles.dtDropdownWide]}
        containerStyle={styles.dropdownContainer}
        placeholderStyle={styles.dropdownPlaceholder}
        selectedTextStyle={styles.dropdownSelectedText}
        data={MONTHS}
        labelField="label"
        valueField="value"
        placeholder="Lună"
        value={value.month}
        onChange={(item) => onChange({ ...value, month: item.value })}
      />
      <Dropdown
        style={[styles.dtDropdown]}
        containerStyle={styles.dropdownContainer}
        placeholderStyle={styles.dropdownPlaceholder}
        selectedTextStyle={styles.dropdownSelectedText}
        data={years}
        labelField="label"
        valueField="value"
        placeholder="An"
        value={value.year}
        onChange={(item) => onChange({ ...value, year: item.value })}
      />
      <Dropdown
        style={[styles.dtDropdown]}
        containerStyle={styles.dropdownContainer}
        placeholderStyle={styles.dropdownPlaceholder}
        selectedTextStyle={styles.dropdownSelectedText}
        data={HOURS}
        labelField="label"
        valueField="value"
        placeholder="Oră"
        value={value.hour}
        onChange={(item) => onChange({ ...value, hour: item.value })}
      />
      <Dropdown
        style={[styles.dtDropdown]}
        containerStyle={styles.dropdownContainer}
        placeholderStyle={styles.dropdownPlaceholder}
        selectedTextStyle={styles.dropdownSelectedText}
        data={MINUTES}
        labelField="label"
        valueField="value"
        placeholder="Min"
        value={value.minute}
        onChange={(item) => onChange({ ...value, minute: item.value })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: C.textDim,
  },
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
  statusCard: {
    backgroundColor: C.dangerBg,
    borderColor: C.borderStrong,
  },
  cardTitle: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '400',
    color: C.text,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 13,
    color: C.textDim,
  },
  hint: {
    fontSize: 12.5,
    color: C.textFaint,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginTop: 4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dtDropdown: {
    width: 78,
    height: 44,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 10,
    backgroundColor: C.surface2,
  },
  dtDropdownWide: {
    width: 128,
  },
  dropdownContainer: {
    borderRadius: R.md,
    borderColor: C.border,
  },
  dropdownPlaceholder: {
    color: C.textFaint,
    fontSize: 13,
  },
  dropdownSelectedText: {
    color: C.text,
    fontSize: 13,
  },
  messageInput: {
    minHeight: 44,
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.surface2,
    color: C.text,
    fontSize: 14,
    textAlignVertical: 'top',
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
  dangerButton: {
    backgroundColor: C.danger,
    borderRadius: R.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
  },
  dangerButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: C.surface,
    borderRadius: R.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.borderStrong,
    marginTop: 2,
  },
  stopButtonText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    gap: 12,
    ...S.float,
  },
  modalTitle: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '400',
    color: C.text,
  },
  confirmText: {
    fontSize: 14,
    color: C.textDim,
    lineHeight: 20,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textFaint,
  },
});
