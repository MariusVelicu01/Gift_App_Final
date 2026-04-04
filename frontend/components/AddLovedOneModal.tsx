import React, { useMemo, useState } from 'react';
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
import { createLovedOne } from '../services/lovedOnesApi';
import { uploadImageApi } from '../services/uploadApi';

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
    return {
      label: String(year),
      value: year,
    };
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
};

export default function AddLovedOneModal({
  visible,
  onClose,
  onSaved,
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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const years = useMemo(() => getYearOptions(), []);
  const estimatedAgeOptions = useMemo(() => getEstimatedAgeOptions(), []);

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

    if (estimatedAgeRange) {
      setEstimatedAgeRange(null);
    }

    if (month !== null) {
      const maxDays = getDaysInMonth(selectedYear, month);

      if (day !== null && day > maxDays) {
        setDay(null);
      }
    }
  };

  const handleEstimatedAgeChange = (selectedRange: string) => {
    setEstimatedAgeRange(selectedRange);

    if (year !== null) {
      setYear(null);
    }
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

      let imageUrl: string | undefined;

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

      if (imageUrl) {
        payload.imageUrl = imageUrl;
      }

      if (year !== null) {
        payload.year = year;
      }

      if (estimatedAgeRange) {
        payload.estimatedAgeRange = estimatedAgeRange;
      }

      await createLovedOne(token!, payload);

      handleClose();
      onSaved();
    } catch (e) {
      setError('Nu am putut salva.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.handle} />

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Adaugă persoană</Text>
            <Text style={styles.sectionHint}>
              Câmpurile marcate cu * sunt obligatorii.
            </Text>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Text style={styles.label}>Nume *</Text>
            <Text style={styles.fieldHint}>
              Exemplu: Popescu Andrei
            </Text>
            <TextInput
              placeholder="Ex: Popescu Andrei"
              style={styles.input}
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (error) setError('');
              }}
            />

            <Text style={styles.label}>Zi *</Text>
            <Text style={styles.fieldHint}>Obligatoriu</Text>
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
              onChange={(item) => {
                setDay(item.value);
                if (error) setError('');
              }}
            />

            <Text style={styles.label}>Lună *</Text>
            <Text style={styles.fieldHint}>Obligatoriu</Text>
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
              onChange={(item) => {
                handleMonthChange(item.value);
                if (error) setError('');
              }}
            />

            <Text style={styles.label}>An</Text>
            <Text style={styles.fieldHint}>
              Opțional. Dacă îl alegi, intervalul de vârstă nu mai este necesar.
            </Text>
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
              onChange={(item) => {
                handleYearChange(item.value);
                if (error) setError('');
              }}
            />

            <Text style={styles.label}>Vârstă estimată</Text>
            <Text style={styles.fieldHint}>
              Opțional. Alege doar dacă nu cunoști anul.
            </Text>
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
              placeholder="Selectează intervalul de vârstă"
              searchPlaceholder="Caută intervalul..."
              value={estimatedAgeRange}
              onChange={(item) => {
                handleEstimatedAgeChange(item.value);
                if (error) setError('');
              }}
            />

            <Text style={styles.label}>Gen</Text>
            <Text style={styles.fieldHint}>Opțional</Text>
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
            <Text style={styles.fieldHint}>
              Opțional. Preferințe, hobby-uri, idei de cadouri.
            </Text>
            <TextInput
              placeholder="Ex: îi plac parfumurile, cărțile și produsele de skincare"
              style={[styles.input, styles.textArea]}
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            <Text style={styles.label}>Poză</Text>
            <Text style={styles.fieldHint}>Opțional</Text>
            <Pressable style={styles.imageButton} onPress={pickImage}>
              <Text style={styles.imageButtonText}>Alege poză</Text>
            </Pressable>

            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.preview} />
            )}

            <Pressable
              style={[styles.saveButton, loading && styles.disabledButton]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Se salvează...' : 'Salvează'}
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '88%',
    minHeight: '55%',
    paddingBottom: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d1d5db',
    marginTop: 10,
    marginBottom: 6,
  },
  body: {
    padding: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 14,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
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
  dropdownSearch: {
    height: 42,
    borderRadius: 8,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#2563eb',
  },
  genderButtonText: {
    color: '#111827',
    fontWeight: '700',
  },
  genderButtonTextActive: {
    color: '#fff',
  },
  imageButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  imageButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  preview: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  closeButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeButtonText: {
    color: '#6b7280',
    fontWeight: '700',
  },
});