import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useAuth } from '../../../context/AuthContext';
import {
  getLegalDocs,
  updateLegalDoc,
  LegalDoc,
  LegalDocType,
  LegalSection,
} from '../../../services/legalApi';
import { getModalBackdropResponder } from '../../../utils/modalBackdrop';
import { C, R, S } from '../../../constants/theme';
import AdminFooter from '../components/AdminFooter';

const TYPE_TABS: { id: LegalDocType; label: string }[] = [
  { id: 'privacy', label: 'Confidențialitate' },
  { id: 'terms', label: 'Termeni și condiții' },
  { id: 'affiliate', label: 'Marketing afiliat' },
];

function formatRo(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LegalScreen() {
  const { token } = useAuth();
  const [docs, setDocs] = useState<Record<LegalDocType, LegalDoc> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [selectedType, setSelectedType] = useState<LegalDocType>('privacy');
  const [sections, setSections] = useState<LegalSection[]>([]);
  const loadedTypeRef = useRef<LegalDocType | null>(null);

  const [confirmTermsVisible, setConfirmTermsVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await getLegalDocs();
      setDocs(data);
    } catch {
      setError('Nu am putut încărca documentele legale.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Resets the editable section list whenever the selected document changes (or first
  // loads) — but never overwrites in-progress edits on the same document.
  useEffect(() => {
    if (!docs) return;
    if (loadedTypeRef.current === selectedType) return;
    setSections(docs[selectedType].sections.map((s) => ({ ...s })));
    loadedTypeRef.current = selectedType;
  }, [docs, selectedType]);

  const updateSection = (index: number, field: 'heading' | 'body', value: string) => {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const removeSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const addSection = () => {
    setSections((prev) => [...prev, { heading: '', body: '' }]);
  };

  const doSave = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateLegalDoc(token, selectedType, sections);
      setDocs((prev) => (prev ? { ...prev, [selectedType]: updated } : prev));
      setConfirmTermsVisible(false);
    } catch (e: any) {
      setError(e?.message || 'Nu am putut salva documentul.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePress = () => {
    const invalid = sections.some((s) => !s.heading.trim() || !s.body.trim());
    if (sections.length === 0 || invalid) {
      setError('Fiecare secțiune trebuie să aibă titlu și conținut.');
      return;
    }
    setError('');
    if (selectedType === 'terms') {
      setConfirmTermsVisible(true);
      return;
    }
    doSave();
  };

  if (loading) {
    return (
      <View style={styles.centerBlock}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Se încarcă...</Text>
      </View>
    );
  }

  const currentDoc = docs?.[selectedType];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Legal</Text>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.tabRow}>
        {TYPE_TABS.map((tab) => {
          const isActive = tab.id === selectedType;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setSelectedType(tab.id)}
              style={[styles.typeTab, isActive && styles.typeTabActive]}
            >
              <Text style={[styles.typeTabText, isActive && styles.typeTabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!!currentDoc && (
        <Text style={styles.metaText}>
          Versiune {currentDoc.version} · Actualizat: {formatRo(currentDoc.updatedAt)}
        </Text>
      )}

      {selectedType === 'terms' && (
        <View style={[styles.card, styles.warningCard]}>
          <Text style={styles.warningText}>
            Salvarea modificărilor la Termeni și condiții va solicita tuturor utilizatorilor
            să accepte din nou termenii actualizați, printr-un modal obligatoriu, la
            următoarea deschidere a aplicației.
          </Text>
        </View>
      )}

      {sections.map((section, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Secțiunea {index + 1}</Text>
            <Pressable onPress={() => removeSection(index)} hitSlop={8}>
              <Text style={styles.removeText}>Șterge</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Titlu</Text>
          <TextInput
            style={styles.input}
            value={section.heading}
            onChangeText={(v) => updateSection(index, 'heading', v)}
            placeholder="Titlul secțiunii"
            placeholderTextColor={C.textFaint}
          />

          <Text style={styles.label}>Conținut</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={section.body}
            onChangeText={(v) => updateSection(index, 'body', v)}
            placeholder="Conținutul secțiunii"
            placeholderTextColor={C.textFaint}
            multiline
          />
        </View>
      ))}

      <Pressable style={styles.addButton} onPress={addSection}>
        <Text style={styles.addButtonText}>+ Adaugă secțiune</Text>
      </Pressable>

      <Pressable
        style={[styles.saveButton, saving && styles.disabledButton]}
        onPress={handleSavePress}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Se salvează...' : 'Salvează'}</Text>
      </Pressable>

      <Modal
        visible={confirmTermsVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setConfirmTermsVisible(false)}
      >
        <View
          style={styles.modalOverlay}
          {...getModalBackdropResponder(() => setConfirmTermsVisible(false))}
        >
          <View style={styles.confirmModalCard}>
            <Text style={styles.modalTitle}>Salvezi Termenii și condițiile?</Text>
            <Text style={styles.confirmText}>
              Toți utilizatorii vor primi un modal obligatoriu de acceptare a termenilor
              actualizați, la următoarea deschidere a aplicației.
            </Text>

            <Pressable
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={doSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Se salvează...' : 'Salvează și notifică utilizatorii'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setConfirmTermsVisible(false)}
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
    gap: 14,
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
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.pill,
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  typeTabActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textDim,
  },
  typeTabTextActive: {
    color: C.accentInk,
  },
  metaText: {
    fontSize: 12,
    color: C.textFaint,
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
  warningCard: {
    backgroundColor: C.dangerBg,
    borderColor: C.borderStrong,
  },
  warningText: {
    fontSize: 13,
    color: C.danger,
    lineHeight: 19,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
  removeText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.danger,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textFaint,
  },
  input: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.surface2,
    color: C.text,
    fontSize: 14,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  addButton: {
    borderRadius: R.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderStrong,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.accent,
  },
  saveButton: {
    backgroundColor: C.accent,
    borderRadius: R.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: C.accentInk,
    fontSize: 14,
    fontWeight: '600',
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
