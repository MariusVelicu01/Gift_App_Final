import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getModalBackdropResponder } from '../utils/modalBackdrop';
import {
  LEGAL_LAST_UPDATED,
  PRIVACY_POLICY_SECTIONS,
  TERMS_SECTIONS,
} from '../constants/legalContent';
import { C, R, S } from '../constants/theme';

type LegalDocType = 'privacy' | 'terms' | null;

type Props = {
  type: LegalDocType;
  onClose: () => void;
};

export default function LegalDocumentModal({ type, onClose }: Props) {
  const isPrivacy = type === 'privacy';
  const title = isPrivacy ? 'Politica de confidențialitate' : 'Termeni și condiții';
  const sections = isPrivacy ? PRIVACY_POLICY_SECTIONS : TERMS_SECTIONS;

  return (
    <Modal visible={type !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay} {...getModalBackdropResponder(onClose)}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.updated}>Actualizat: {LEGAL_LAST_UPDATED}</Text>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {sections.map((section) => (
              <View key={section.heading} style={styles.section}>
                <Text style={styles.sectionHeading}>{section.heading}</Text>
                <Text style={styles.sectionBody}>{section.body}</Text>
              </View>
            ))}
          </ScrollView>

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
