import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { useAuth } from '../context/AuthContext';
import { createLovedOne, updateLovedOne } from '../services/lovedOnesApi';
import { uploadImageApi } from '../services/uploadApi';
import { LovedOne } from '../types/lovedOnes';

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

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  label: String(i + 1).padStart(2, '0'),
  value: i + 1,
}));

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: currentYear - 1930 + 1 }, (_, i) => {
    const year = currentYear - i;
    return { label: String(year), value: year };
  });
}

function getEstimatedAgeOptions() {
  const options: { label: string; value: string }[] = [];

  for (let start = 0; start < 110; start += 5) {
    const end = start + 5;
    options.push({
      label: `${start}-${end}`,
      value: `${start}-${end}`,
    });
  }

  options.push({
    label: '110+',
    value: '110+',
  });

  return options;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function isDateInFuture(day: number, month: number, year: number) {
  const selected = new Date(year, month - 1, day, 23, 59, 59, 999);
  return selected.getTime() > Date.now();
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: LovedOne | null;
};

export default function AddLovedOneModal({
  visible,
  onClose,
  onSaved,
  initialData,
}: Props) {
  const { token } = useAuth();

  const [name, setName] = useState('');
  const [day, setDay] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [estimatedAgeRange, setEstimatedAgeRange] = useState<string | null>(null);
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<any>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const years = useMemo(() => getYearOptions(), []);
  const estimatedAgeOptions = useMemo(() => getEstimatedAgeOptions(), []);

  useEffect(() => {
    if (!visible) return;

    if (initialData) {
      setName(initialData.name || '');
      setDay(initialData.day ?? null);
      setMonth(initialData.month ?? null);
      setYear(initialData.year ?? null);
      setEstimatedAgeRange(initialData.estimatedAgeRange ?? null);
      setGender(initialData.gender ?? 'unknown');
      setNotes(initialData.notes ?? '');
      setCurrentImageUrl(initialData.imageUrl ?? null);
      setImageUri(null);
      setImageFile(null);
      setError('');
      setLoading(false);
    } else {
      reset();
    }
  }, [visible, initialData]);

  const reset = () => {
    setName('');
    setDay(null);
    setMonth(null);
    setYear(null);
    setEstimatedAgeRange(null);
    setGender('unknown');
    setNotes('');
    setImageUri(null);
    setImageFile(null);
    setCurrentImageUrl(null);
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleMonthChange = (selectedMonth: number) => {
    setMonth(selectedMonth);

    const referenceYear = year ?? new Date().getFullYear();
    const maxDays = getDaysInMonth(referenceYear, selectedMonth);

    if (day !== null && day > maxDays) {
      setDay(null);
    }
  };

  const handleYearChange = (selectedYear: number) => {
    setYear(selectedYear);
    setEstimatedAgeRange(null);

    if (month !== null) {
      const maxDays = getDaysInMonth(selectedYear, month);

      if (day !== null && day > maxDays) {
        setDay(null);
      }
    }
  };

  const handleEstimatedAgeChange = (selectedRange: string) => {
    setEstimatedAgeRange(selectedRange);
    setYear(null);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageFile((asset as any).file ?? null);
    }
  };

  const validate = () => {
    if (!name.trim()) {
      return 'Numele este obligatoriu.';
    }

    if (day === null || month === null) {
      return 'Selectează ziua și luna.';
    }

    if (year === null && !estimatedAgeRange) {
      return 'Selectează anul sau intervalul pentru vârsta estimată.';
    }

    if (year !== null && isDateInFuture(day, month, year)) {
      return 'Data nașterii nu poate fi în viitor.';
    }

    return '';
  };

  const handleSave = async () => {
    try {
      setError('');

      const validationError = validate();
      if (validationError) {
        setError(validationError);
        return;
      }

      setLoading(true);

      let imageUrl = currentImageUrl || undefined;

      if (imageUri && token) {
        imageUrl = await uploadImageApi(
          {
            uri: imageUri,
            file: imageFile,
          },
          token
        );
      }

      const payload: any = {
        name: name.trim(),
        day,
        month,
        gender,
        notes: notes.trim(),
      };

      if (imageUrl) payload.imageUrl = imageUrl;
      if (year !== null) payload.year = year;
      if (estimatedAgeRange) payload.estimatedAgeRange = estimatedAgeRange;

      if (initialData?.id) {
        await updateLovedOne(token!, initialData.id, payload);
      } else {
        await createLovedOne(token!, payload);
      }

      handleClose();
      onSaved();
    } catch {
      setError(
        initialData ? 'Nu am putut actualiza.' : 'Nu am putut salva.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.handle} />

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>
              {initialData ? 'Editează persoana' : 'Adaugă persoană'}
            </Text>
            <Text style={styles.sectionHint}>
              Câmpurile marcate cu * sunt obligatorii.
            </Text>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Text style={styles.label}>Nume *</Text>
            <TextInput
              placeholder="Ex: Popescu Andrei"
              style={styles.input}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Zi *</Text>
            <Dropdown
              style={styles.dropdown}
              containerStyle={styles.dropdownContainer}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              inputSearchStyle={styles.dropdownSearch}
              data={DAYS}
              search
              maxHeight={260}
              labelField="label"
              valueField="value"
              placeholder="Selectează ziua"
              searchPlaceholder="Caută ziua..."
              value={day}
              onChange={(item) => setDay(item.value)}
            />

            <Text style={styles.label}>Lună *</Text>
            <Dropdown
              style={styles.dropdown}
              containerStyle={styles.dropdownContainer}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              inputSearchStyle={styles.dropdownSearch}
              data={MONTHS}
              search
              maxHeight={260}
              labelField="label"
              valueField="value"
              placeholder="Selectează luna"
              searchPlaceholder="Caută luna..."
              value={month}
              onChange={(item) => handleMonthChange(item.value)}
            />

            <Text style={styles.label}>An</Text>
            <Dropdown
              style={styles.dropdown}
              containerStyle={styles.dropdownContainer}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              inputSearchStyle={styles.dropdownSearch}
              data={years}
              search
              maxHeight={260}
              labelField="label"
              valueField="value"
              placeholder="Selectează anul"
              searchPlaceholder="Caută anul..."
              value={year}
              onChange={(item) => handleYearChange(item.value)}
            />

            <Text style={styles.label}>Vârstă estimată</Text>
            <Dropdown
              style={styles.dropdown}
              containerStyle={styles.dropdownContainer}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              inputSearchStyle={styles.dropdownSearch}
              data={estimatedAgeOptions}
              search
              maxHeight={260}
              labelField="label"
              valueField="value"
              placeholder="Selectează intervalul"
              searchPlaceholder="Caută intervalul..."
              value={estimatedAgeRange}
              onChange={(item) => handleEstimatedAgeChange(item.value)}
            />

            <Text style={styles.label}>Gen</Text>
            <View style={styles.genderRow}>
              {['male', 'female', 'unknown'].map((g) => (
                <Pressable
                  key={g}
                  style={[
                    styles.genderButton,
                    gender === g && styles.genderButtonActive,
                  ]}
                  onPress={() => setGender(g as 'male' | 'female' | 'unknown')}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      gender === g && styles.genderButtonTextActive,
                    ]}
                  >
                    {g === 'male' ? 'Masculin' : g === 'female' ? 'Feminin' : '-'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Descriere</Text>
            <TextInput
              placeholder="Preferințe, hobby-uri..."
              style={[styles.input, styles.textArea]}
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            <Text style={styles.label}>Poză</Text>
            <Pressable style={styles.imageButton} onPress={pickImage}>
              <Text style={styles.imageButtonText}>
                {currentImageUrl || imageUri ? 'Schimbă poza' : 'Alege poză'}
              </Text>
            </Pressable>

            {(imageUri || currentImageUrl) && (
              <Image
                source={{ uri: imageUri || currentImageUrl || undefined }}
                style={styles.preview}
              />
            )}

            <Pressable
              style={[styles.saveButton, loading && styles.disabledButton]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading
                  ? initialData
                    ? 'Se actualizează...'
                    : 'Se salvează...'
                  : initialData
                  ? 'Salvează modificările'
                  : 'Salvează'}
              </Text>
            </Pressable>

            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>Închide</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    minHeight: '55%',
    paddingBottom: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    marginTop: 10,
    marginBottom: 6,
  },
  body: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    backgroundColor: '#fafafa',
    fontSize: 15,
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
    marginBottom: 12,
  },
  dropdownContainer: {
    borderRadius: 12,
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
  dropdownSearch: {
    height: 42,
    borderRadius: 8,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  genderButtonActive: {
    backgroundColor: '#be123c',
    borderColor: '#be123c',
  },
  genderButtonText: {
    color: '#6b7280',
    fontWeight: '700',
    fontSize: 14,
  },
  genderButtonTextActive: {
    color: '#fff',
  },
  imageButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  imageButtonText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 14,
  },
  preview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  saveButton: {
    backgroundColor: '#be123c',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  closeButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeButtonText: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 14,
  },
});