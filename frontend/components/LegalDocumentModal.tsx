import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getModalBackdropResponder } from '../utils/modalBackdrop';
import { getLegalDocs, LegalDoc, LegalDocType } from '../services/legalApi';
import { C, R, S } from '../constants/theme';

type LegalDocTypeOrNull = LegalDocType | null;

type Props = {
  type: LegalDocTypeOrNull;
  onClose: () => void;
};

const TITLES: Record<LegalDocType, string> = {
  privacy: 'Politica de confidențialitate',
  terms: 'Termeni și condiții',
  affiliate: 'Marketing afiliat',
};

function formatRo(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function LegalDocumentModal({ type, onClose }: Props) {
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!type) {
      setDoc(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getLegalDocs()
      .then((docs) => {
        if (!cancelled) setDoc(docs[type]);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type]);

  const title = type ? TITLES[type] : '';

  return (
    <Modal visible={type !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay} {...getModalBackdropResponder(onClose)}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {!!doc && <Text style={styles.updated}>Actualizat: {formatRo(doc.updatedAt)}</Text>}
          </View>

          {loading || !doc ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator color={C.accent} />
            </View>
          ) : (
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              {doc.sections.map((section, i) => (
                <View key={`${section.heading}-${i}`} style={styles.section}>
                  <Text style={styles.sectionHeading}>{section.heading}</Text>
                  <Text style={styles.sectionBody}>{section.body}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Închide</Text>
          </Pressable>
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
  card: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xxl,
    borderTopRightRadius: R.xxl,
    maxHeight: '85%',
    paddingTop: 8,
    ...S.float,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  updated: {
    marginTop: 4,
    fontSize: 12,
    color: C.textFaint,
  },
  loadingBlock: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  body: {
    paddingHorizontal: 24,
  },
  bodyContent: {
    paddingVertical: 18,
    paddingBottom: 28,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: C.accent,
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 21,
    color: C.textDim,
  },
  closeButton: {
    marginHorizontal: 24,
    marginBottom: 20,
    marginTop: 8,
    backgroundColor: C.accent,
    borderRadius: R.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
