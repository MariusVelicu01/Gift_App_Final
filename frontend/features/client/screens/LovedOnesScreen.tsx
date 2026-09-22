import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { getLovedOnesCache, subscribeLovedOnesCache, invalidateLovedOnesCache } from '../../../services/lovedOnesCache';
import { invalidateCalendarCache } from '../../../services/calendarCache';
import { pushAppBackEntry } from '../../../services/navigationHistory';
import AddLovedOneModal from '../../../components/AddLovedOneModal';
import ClientFooter from '../components/ClientFooter';
import type { ClientTab } from './ClientDashboard';
import LovedOneDetailsScreen from './LovedOneDetailsScreen';
import DriftBlob from '../../../components/landing/DriftBlob';
import RevealIn from '../../../components/landing/RevealIn';
import PhysicsGiftToy from '../components/PhysicsGiftToy';
import { LovedOne } from '../../../types/lovedOnes';
import { PriceAlertTarget } from '../../../types/priceAlerts';
import { C, R, S } from '../../../constants/theme';

// Rendered height of the sidebar's brand group: the headline+brand text row, plus
// the bounded play area below it where the gift can be dragged and flung around.
const SIDE_GROUP_HEIGHT = 400;

// The client shell's own fixed top header (see ClientDashboard's `header` style) sits
// above this screen's ScrollView, so the visible list area is the window height minus
// this. Using the window size directly — rather than measuring the ScrollView via
// onLayout — is what actually stays reliable once this screen is nested inside the
// dashboard's own flex chain.
const CLIENT_HEADER_HEIGHT = 64;

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
  onNavigateTab?: (tab: ClientTab) => void;
};

const LovedOneCard = React.memo(function LovedOneCard({
  item,
  isDeleting,
  onPress,
}: {
  item: LovedOne;
  isDeleting: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ hovered, pressed }) => [
        styles.card,
        hovered && !isDeleting && styles.cardHover,
        pressed && !isDeleting && styles.cardPressed,
        isDeleting && styles.cardDeleting,
      ]}
      onPress={onPress}
      disabled={isDeleting}
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
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
});

export default function LovedOnesScreen({
  priceAlertTarget,
  onPriceAlertTargetConsumed,
  giftDetailsTarget,
  onGiftDetailsTargetConsumed,
  lovedOneTarget,
  onLovedOneTargetConsumed,
  resetRef,
  onNavigateTab,
}: Props) {
  const { token } = useAuth();
  const [data, setData] = useState<LovedOne[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLovedOneId, setSelectedLovedOneId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [giftToyFullscreen, setGiftToyFullscreen] = useState(false);
  const selectedLovedOneBackRef = useRef<ReturnType<typeof pushAppBackEntry> | null>(
    null
  );
  const { width, height: windowHeight } = useWindowDimensions();
  const isCompact = width < 760;
  const isNarrow = width < 960;

  // Pins the brand group to the middle of the visible viewport as the page scrolls,
  // using native CSS `position: sticky` rather than manual scroll-offset math — the
  // browser itself guarantees this stays correct (and clamped to the sidebar's own
  // bounds) regardless of how this screen ends up nested inside the dashboard's flex
  // chain, which custom onLayout/onScroll measurements kept getting wrong in practice.
  const sideGroupTop = Math.max(windowHeight - CLIENT_HEADER_HEIGHT, 1) / 2 - SIDE_GROUP_HEIGHT / 2;

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

  const goBackFromDetails = (deletedId?: string) => {
    if (selectedLovedOneBackRef.current?.goBack()) return;

    if (deletedId) {
      setDeletingId(deletedId);
      setData(prev => prev.filter(p => p.id !== deletedId));
    }
    setSelectedLovedOneId(null);
    loadLovedOnes().finally(() => setDeletingId(null));
  };

  const personCards = data.map((item) => (
    <LovedOneCard
      key={item.id}
      item={item}
      isDeleting={deletingId === item.id}
      onPress={() => setSelectedLovedOneId(item.id)}
    />
  ));

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
        onNavigateTab={onNavigateTab}
      />
    );
  }

  return (
    <>
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.container, isNarrow && styles.containerFlush]}>
        <RevealIn delay={0}>
          <View style={styles.header}>
            <Text style={styles.title}>Persoane dragi</Text>
            <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
              <Text style={styles.addButtonText}>+ Adaugă</Text>
            </Pressable>
          </View>
        </RevealIn>

        <RevealIn delay={80}>
          {data.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nu ai încă persoane salvate</Text>
              <Text style={styles.emptyText}>
                Adaugă prima persoană dragă pentru a începe.
              </Text>
            </View>
          ) : isCompact ? (
            <View style={styles.listStack}>
              {personCards}

              <Pressable
                style={({ hovered, pressed }) => [
                  styles.giftToyListCard,
                  hovered && styles.giftToyListCardHover,
                  pressed && styles.giftToyListCardPressed,
                ]}
                onPress={() => setGiftToyFullscreen(true)}
              >
                <View style={styles.sideBlobClip} pointerEvents="none">
                  <DriftBlob style={styles.sideBlobA} driftX={12} driftY={9} duration={5400} />
                  <DriftBlob style={styles.sideBlobB} driftX={-14} driftY={-8} duration={6800} />
                </View>

                <View style={styles.giftToyListCardInner}>
                  <View style={styles.sideTextRow}>
                    <View style={styles.sideCopy}>
                      <Text style={styles.sideHeadline}>Cadoul potrivit.</Text>
                      <Text style={[styles.sideHeadline, styles.sideHeadlineAccent]}>La timpul potrivit.</Text>
                    </View>
                    <Text style={styles.sideBrand}>PresentPerfect</Text>
                  </View>

                  <View style={styles.giftToyListPlayBox} pointerEvents="none">
                    <PhysicsGiftToy size={44} />
                  </View>
                </View>
              </Pressable>
            </View>
          ) : (
            <View style={styles.wideRow}>
              <View style={styles.listCol}>{personCards}</View>

              <View style={styles.sideCol}>
                <View style={styles.sideBlobClip} pointerEvents="none">
                  <DriftBlob style={styles.sideBlobA} driftX={12} driftY={9} duration={5400} />
                  <DriftBlob style={styles.sideBlobB} driftX={-14} driftY={-8} duration={6800} />
                </View>

                <View style={[styles.sideGroup, { top: sideGroupTop }]}>
                  <View style={styles.sideTextRow}>
                    <View style={styles.sideCopy}>
                      <Text style={styles.sideHeadline}>Cadoul potrivit.</Text>
                      <Text style={[styles.sideHeadline, styles.sideHeadlineAccent]}>La timpul potrivit.</Text>
                    </View>
                    <Text style={styles.sideBrand}>PresentPerfect</Text>
                  </View>

                  <View style={styles.sidePlayBox}>
                    <PhysicsGiftToy size={44} fast />

                    <Pressable
                      style={({ hovered, pressed }) => [
                        styles.sidePlayMaximizeButton,
                        hovered && styles.sidePlayMaximizeButtonHover,
                        pressed && styles.sidePlayMaximizeButtonPressed,
                      ]}
                      onPress={() => setGiftToyFullscreen(true)}
                      hitSlop={6}
                      accessibilityLabel="Deschide jocul pe tot ecranul"
                    >
                      <Ionicons name="expand-outline" size={15} color="#fdf2f4" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          )}
        </RevealIn>

        <ClientFooter onNavigate={onNavigateTab} />
      </ScrollView>

      <AddLovedOneModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={() => {
          invalidateCalendarCache();
          invalidateLovedOnesCache();
        }}
      />

      <Modal
        visible={giftToyFullscreen}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setGiftToyFullscreen(false)}
      >
        <SafeAreaView style={styles.fullscreenToy}>
          <View style={styles.sideBlobClip} pointerEvents="none">
            <DriftBlob style={styles.sideBlobA} driftX={16} driftY={12} duration={5400} />
            <DriftBlob style={styles.sideBlobB} driftX={-18} driftY={-10} duration={6800} />
          </View>

          <Pressable
            style={({ hovered, pressed }) => [
              styles.fullscreenCloseButton,
              hovered && styles.fullscreenCloseButtonHover,
              pressed && styles.fullscreenCloseButtonPressed,
            ]}
            onPress={() => setGiftToyFullscreen(false)}
            hitSlop={8}
          >
            <Ionicons name="close" size={22} color="#fdf2f4" />
          </Pressable>

          <View style={styles.fullscreenHeader}>
            <Text style={styles.sideHeadline}>Cadoul potrivit.</Text>
            <Text style={[styles.sideHeadline, styles.sideHeadlineAccent]}>La timpul potrivit.</Text>
            <Text style={styles.sideBrand}>PresentPerfect</Text>
          </View>

          <View style={styles.fullscreenPlayArea}>
            <PhysicsGiftToy size={72} fast />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: C.bg,
    paddingBottom: 32,
  },
  containerFlush: {
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  listStack: {
    gap: 12,
  },
  wideRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
  },
  listCol: {
    flex: 3,
    gap: 12,
  },
  sideCol: {
    flex: 1.4,
    minHeight: 160,
    backgroundColor: '#0b0508',
    borderRadius: R.xl,
    position: 'relative',
  },
  // Separate from sideGroup (not an ancestor of it) so its overflow:hidden clips only
  // the blobs — position:sticky on sideGroup needs an unclipped path up to the
  // ScrollView to find it as its scrolling container.
  sideBlobClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: R.xl,
    overflow: 'hidden',
  },
  sideBlobA: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,77,109,0.16)',
  },
  sideBlobB: {
    position: 'absolute',
    bottom: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(253,242,244,0.06)',
  },
  sideGroup: {
    // Web-only: CSS position:sticky + userSelect, cast past RN's stricter ViewStyle type.
    position: 'sticky' as any,
    left: 0,
    right: 0,
    height: SIDE_GROUP_HEIGHT,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
    userSelect: 'none' as any,
  },
  sideTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sidePlayBox: {
    flex: 1,
    marginHorizontal: -16,
    borderRadius: R.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    position: 'relative',
  },
  sidePlayMaximizeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,5,8,0.55)',
    zIndex: 2,
  },
  sidePlayMaximizeButtonHover: {
    backgroundColor: 'rgba(11,5,8,0.8)',
  },
  sidePlayMaximizeButtonPressed: {
    transform: [{ scale: 0.9 }],
  },
  giftToyListCard: {
    backgroundColor: '#0b0508',
    borderRadius: R.xl,
    position: 'relative',
    overflow: 'hidden',
    transitionProperty: 'transform' as any,
    transitionDuration: '160ms' as any,
    transitionTimingFunction: 'ease-out' as any,
    cursor: 'pointer' as any,
  },
  giftToyListCardHover: {
    transform: [{ translateY: -2 }],
  },
  giftToyListCardPressed: {
    transform: [{ scale: 0.99 }],
  },
  giftToyListCardInner: {
    height: SIDE_GROUP_HEIGHT,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
    userSelect: 'none' as any,
  },
  giftToyListPlayBox: {
    flex: 1,
    borderRadius: R.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  sideCopy: {
    flexShrink: 1,
    gap: 2,
  },
  sideHeadline: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fdf2f4',
    letterSpacing: -0.3,
    lineHeight: 18,
  },
  sideHeadlineAccent: {
    color: '#ff4d6d',
  },
  sideBrand: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(253,242,244,0.65)',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  fullscreenToy: {
    flex: 1,
    backgroundColor: '#0b0508',
  },
  fullscreenCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 2,
  },
  fullscreenCloseButtonHover: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  fullscreenCloseButtonPressed: {
    transform: [{ scale: 0.92 }],
  },
  fullscreenHeader: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  fullscreenPlayArea: {
    flex: 1,
    margin: 20,
    borderRadius: R.xl,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
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
  cardDeleting: {
    opacity: 0.4,
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
