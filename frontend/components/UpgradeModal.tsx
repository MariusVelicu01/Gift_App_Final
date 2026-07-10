import React from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { C, R, S } from '../constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  reason?: 'loved_ones' | 'price_alerts' | 'giftbot' | 'pdf' | 'share' | 'stats';
};

const REASONS: Record<string, string> = {
  loved_ones: 'Ai atins limita de 3 persoane dragi pe planul gratuit.',
  price_alerts: 'Ai atins limita de 10 alerte de preț pe planul gratuit.',
  giftbot: 'GiftBot avansat este disponibil doar pe Premium.',
  pdf: 'Exportul PDF este disponibil doar pe Premium.',
  share: 'Partajarea planurilor este disponibilă doar pe Premium.',
  stats: 'Statisticile anuale sunt disponibile doar pe Premium.',
};

const FREE_FEATURES = [
  '3 persoane dragi',
  '10 alerte de preț',
  'GiftBot de bază',
  'Planuri de cadouri',
  'Remindere zile de naștere',
];

const PREMIUM_FEATURES = [
  'Persoane dragi nelimitate',
  'Alerte de preț nelimitate',
  'GiftBot avansat + istoric',
  'Export PDF planuri',
  'Partajare planuri',
  'Statistici anuale cheltuieli',
  'Suport prioritar',
];

export default function UpgradeModal({ visible, onClose, reason }: Props) {
  const subtitle = reason ? REASONS[reason] : 'Deblochează toate funcționalitățile GiftApp.';

  const openContact = () => {
    Linking.openURL(
      'mailto:contact@giftapp.ro?subject=Upgrade%20Premium&body=Bun%C4%83%20ziua%2C%20doresc%20s%C4%83%20upgradez%20la%20Premium.'
    ).catch(() => {});
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.crown}>★</Text>
            <Text style={styles.headerTitle}>GiftApp Premium</Text>
            <Text style={styles.price}>de la 19 RON / lună</Text>
          </View>

          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          <ScrollView style={styles.tableScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.tableRow}>
              <View style={[styles.tableCol, styles.tableColFree]}>
                <Text style={styles.tableColHeader}>Gratuit</Text>
                {FREE_FEATURES.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Text style={styles.featureIconFree}>·</Text>
                    <Text style={styles.featureTextFree}>{f}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.tableCol, styles.tableColPremium]}>
                <Text style={styles.tableColHeader}>Premium</Text>
                {PREMIUM_FEATURES.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Text style={styles.featureIconPremium}>✓</Text>
                    <Text style={styles.featureTextPremium}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <Pressable
            style={({ pressed }) => [styles.upgradeButton, pressed && styles.upgradeButtonPressed]}
            onPress={openContact}
          >
            <Text style={styles.upgradeButtonText}>Upgrade la Premium</Text>
          </Pressable>

          <Pressable onPress={onClose} style={styles.dismissButton}>
            <Text style={styles.dismissText}>Mai târziu</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.xxl,
    width: '100%',
    maxWidth: 440,
    overflow: 'hidden',
    ...S.float,
  },
  header: {
    backgroundColor: C.accent,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 4,
  },
  crown: {
    fontSize: 28,
    color: '#fbbf24',
  },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '500',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    color: C.textDim,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 2,
  },
  tableScroll: {
    maxHeight: 300,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tableRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 12,
  },
  tableCol: {
    flex: 1,
    borderRadius: R.lg,
    padding: 12,
    gap: 6,
  },
  tableColFree: {
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  tableColPremium: {
    backgroundColor: C.accentSoft,
    borderWidth: 0.5,
    borderColor: C.borderStrong,
  },
  tableColHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: C.accent,
    marginBottom: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  featureIconFree: {
    fontSize: 14,
    color: C.textFaint,
    lineHeight: 18,
  },
  featureTextFree: {
    fontSize: 12,
    color: C.textDim,
    flex: 1,
    lineHeight: 18,
  },
  featureIconPremium: {
    fontSize: 11,
    color: C.accent,
    fontWeight: '700',
    lineHeight: 18,
  },
  featureTextPremium: {
    fontSize: 12,
    color: C.text,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  upgradeButton: {
    backgroundColor: C.accent,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
    paddingVertical: 14,
    borderRadius: R.xl,
    alignItems: 'center',
  },
  upgradeButtonPressed: {
    opacity: 0.85,
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  dismissText: {
    fontSize: 14,
    color: C.textFaint,
    fontWeight: '500',
  },
});
