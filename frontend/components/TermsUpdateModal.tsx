import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getLegalDocs, acceptCurrentTerms, LegalDoc } from '../services/legalApi';
import { C, R, S } from '../constants/theme';

// Mandatory, non-dismissible-without-a-choice modal: shown whenever a logged-in client's
// stored consent version falls behind the current Terms & Conditions version. Reading the
// updated terms is the only thing visible behind it — the user either accepts or logs out.
export default function TermsUpdateModal() {
  const { token, logout, refreshProfile } = useAuth();
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getLegalDocs()
      .then((docs) => setDoc(docs.terms))
      .catch(() => setError('Nu am putut încărca termenii actualizați.'))
      .finally(() => setLoading(false));
  }, []);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    setError('');
    try {
      await acceptCurrentTerms(token);
      await refreshProfile();
    } catch {
      setError('Nu am putut înregistra acceptarea. Încearcă din nou.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Termenii și condițiile s-au actualizat</Text>
            <Text style={styles.subtitle}>
              Te rugăm să citești și să accepți noii termeni pentru a continua să folosești
              PresentPerfect.
            </Text>
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

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[styles.acceptButton, (accepting || loading) && styles.disabledButton]}
            onPress={handleAccept}
            disabled={accepting || loading}
          >
            <Text style={styles.acceptButtonText}>
              {accepting ? 'Se salvează...' : 'Accept termenii actualizați'}
            </Text>
          </Pressable>

          <Pressable style={styles.declineButton} onPress={() => logout()}>
            <Text style={styles.declineButtonText}>Nu accept (deconectare)</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.xxl,
    width: '100%',
    maxWidth: 480,
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
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: C.textDim,
    lineHeight: 19,
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
  errorText: {
    marginHorizontal: 24,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: C.danger,
  },
  acceptButton: {
    marginHorizontal: 24,
    marginTop: 8,
    backgroundColor: C.accent,
    borderRadius: R.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
  declineButton: {
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  declineButtonText: {
    color: C.textFaint,
    fontWeight: '600',
    fontSize: 13,
  },
});
