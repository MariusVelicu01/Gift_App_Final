import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Image,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { getLovedOnesCache, subscribeLovedOnesCache, invalidateLovedOnesCache } from '../../../services/lovedOnesCache';
import { invalidateCalendarCache } from '../../../services/calendarCache';
import { pushAppBackEntry } from '../../../services/navigationHistory';
import AddLovedOneModal from '../../../components/AddLovedOneModal';
import LovedOneDetailsScreen from './LovedOneDetailsScreen';
import { LovedOne } from '../../../types/lovedOnes';
import { PriceAlertTarget } from '../../../types/priceAlerts';
import { C, R, S } from '../../../constants/theme';

type Props = {
  priceAlertTarget?: PriceAlertTarget | null;
  onPriceAlertTargetConsumed?: () => void;
  giftDetailsTarget?: {
    lovedOneId: string;
    giftPlanId: string;
  } | null;
  onGiftDetailsTargetConsumed?: () => void;
  lovedOneTarget?: { lovedOneId: string } | null;
  onLovedOneTargetConsumed?: () => void;
  resetRef?: React.MutableRefObject<(() => void) | null>;
};

export default function LovedOnesScreen({
  priceAlertTarget,
  onPriceAlertTargetConsumed,
  giftDetailsTarget,
  onGiftDetailsTargetConsumed,
  lovedOneTarget,
  onLovedOneTargetConsumed,
  resetRef,
}: Props) {
  const { token } = useAuth();
  const [data, setData] = useState<LovedOne[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLovedOneId, setSelectedLovedOneId] = useState<string | null>(null);
  const selectedLovedOneBackRef = useRef<ReturnType<typeof pushAppBackEntry> | null>(
    null
  );

  const loadLovedOnes = async () => {
    try {
      if (!token) return;
      const response = await getLovedOnesCache(token);
      setData(response);
    } catch (error) {
      console.error('LOAD LOVED ONES ERROR:', error);
    }
  };

  useEffect(() => {
    loadLovedOnes();
    if (!token) return;
    return subscribeLovedOnesCache(loadLovedOnes);
  }, [token]);

  useEffect(() => {
    if (!resetRef) return;

    const resetHandler = () => {
      setSelectedLovedOneId(null);
      loadLovedOnes();
      onPriceAlertTargetConsumed?.();
      onGiftDetailsTargetConsumed?.();
      onLovedOneTargetConsumed?.();
    };

    resetRef.current = resetHandler;

    return () => {
      if (resetRef.current === resetHandler) {
        resetRef.current = null;
      }
    };
  }, [loadLovedOnes, onGiftDetailsTargetConsumed, onLovedOneTargetConsumed, onPriceAlertTargetConsumed, resetRef]);

  useEffect(() => {
    if (priceAlertTarget) {
      setSelectedLovedOneId(priceAlertTarget.alert.lovedOneId);
      return;
    }

    if (giftDetailsTarget) {
      setSelectedLovedOneId(giftDetailsTarget.lovedOneId);
      return;
    }

    if (lovedOneTarget) {
      setSelectedLovedOneId(lovedOneTarget.lovedOneId);
    }
  }, [giftDetailsTarget, lovedOneTarget, priceAlertTarget]);

  useEffect(() => {
    if (!selectedLovedOneId) return;

    const entry = pushAppBackEntry(() => {
      setSelectedLovedOneId(null);
      loadLovedOnes();
    });
    selectedLovedOneBackRef.current = entry;

    return () => {
      entry.remove();
      if (selectedLovedOneBackRef.current === entry) {
        selectedLovedOneBackRef.current = null;
      }
    };
  }, [selectedLovedOneId]);

  const goBackFromDetails = () => {
    if (selectedLovedOneBackRef.current?.goBack()) return;

    setSelectedLovedOneId(null);
    loadLovedOnes();
  };

  if (selectedLovedOneId) {
    const priceAlertMatches =
      priceAlertTarget?.alert.lovedOneId === selectedLovedOneId;
    const giftTargetMatches =
      giftDetailsTarget?.lovedOneId === selectedLovedOneId;

    const lovedOneTargetMatches = lovedOneTarget?.lovedOneId === selectedLovedOneId;

    return (
      <LovedOneDetailsScreen
        key={selectedLovedOneId}
        lovedOneId={selectedLovedOneId}
        onBack={goBackFromDetails}
        initialGiftPlanId={
          priceAlertMatches
            ? priceAlertTarget.alert.giftPlanId
            : giftTargetMatches
            ? giftDetailsTarget.giftPlanId
            : null
        }
        initialProductId={
          priceAlertMatches
            ? priceAlertTarget.alert.productId
            : null
        }
        priceAlert={
          priceAlertMatches
            ? priceAlertTarget.alert
            : null
        }
        onPriceAlertConsumed={onPriceAlertTargetConsumed}
        onGiftPlanTargetConsumed={
          giftTargetMatches
            ? onGiftDetailsTargetConsumed
            : lovedOneTargetMatches
            ? onLovedOneTargetConsumed
            : undefined
        }
        backLabel="Inapoi la persoane"
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Persoane dragi</Text>
          <Text style={styles.subtitle}>{data.length} persoane urmarite</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Adaugă</Text>
        </Pressable>
      </View>

      {data.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nu ai încă persoane salvate</Text>
          <Text style={styles.emptyText}>
            Adaugă prima persoană dragă pentru a începe.
          </Text>
        </View>
      ) : (
        data.map((item) => (
          <Pressable
            key={item.id}
            style={({ hovered, pressed }) => [
              styles.card,
              hovered && styles.cardHover,
              pressed && styles.cardPressed,
            ]}
            onPress={() => setSelectedLovedOneId(item.id)}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>
                  {item.name?.slice(0, 2)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}

            <View style={styles.infoBlock}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {String(item.day).padStart(2, '0')}.{String(item.month).padStart(2, '0')}
                {item.year ? `.${item.year}` : ''}
              </Text>
              {!!item.estimatedAgeRange && (
                <Text style={styles.meta}>Vârstă: {item.estimatedAgeRange}</Text>
              )}
            </View>

            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))
      )}

      <AddLovedOneModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={() => {
          invalidateCalendarCache();
          invalidateLovedOnesCache();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    backgroundColor: C.bg,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '400',
    color: C.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: C.textDim,
    marginTop: 3,
  },
  addButton: {
    backgroundColor: C.accent,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: R.pill,
    alignItems: 'center',
  },
  addButtonText: {
    color: C.accentInk,
    fontWeight: '600',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    borderStyle: 'dashed',
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '400',
    color: C.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: C.textDim,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    ...S.card,
  },
  cardHover: {
    backgroundColor: C.surface2,
    transform: [{ translateY: -2 }],
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '500',
    color: C.accent,
  },
  infoBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '400',
    color: C.text,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  meta: {
    fontSize: 12,
    color: C.textDim,
    marginBottom: 2,
  },
  chevron: {
    fontSize: 22,
    color: C.textFaint,
    lineHeight: 26,
  },
});
