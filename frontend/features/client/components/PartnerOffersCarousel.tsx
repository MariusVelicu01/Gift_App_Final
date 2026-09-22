import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Placeholder banners — swap in real partner store creatives once available.
// Demo-only content, clearly labelled as such in the parent card header.
const DEMO_BANNERS = [
  { store: 'Partener 01', tagline: 'Reduceri de sezon', discount: '-25%', color: '#ff4d6d' },
  { store: 'Partener 02', tagline: 'Colecție nouă', discount: '-15%', color: '#2dd4bf' },
  { store: 'Partener 03', tagline: 'Oferte flash', discount: '-40%', color: '#a78bfa' },
  { store: 'Partener 04', tagline: 'Livrare gratuită', discount: '-10%', color: '#f59e0b' },
];

const AUTO_ADVANCE_MS = 4000;
const SWIPE_THRESHOLD = 40;

type Props = {
  fill?: boolean;
  // Hides the prev/next buttons while keeping the swipe/drag gesture — for spots
  // where the arrows would visually clash with the surrounding card.
  arrows?: boolean;
};

export default function PartnerOffersCarousel({ fill = false, arrows = true }: Props = {}) {
  const count = DEMO_BANNERS.length;
  const [index, setIndex] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const indexRef = useRef(0);
  const trackWidthRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const translateX = useRef(new Animated.Value(0)).current;

  const goTo = useCallback((next: number, manual: boolean) => {
    const clamped = ((next % count) + count) % count;
    indexRef.current = clamped;
    setIndex(clamped);
    if (manual) startAutoTimer();
  }, [count]);

  const startAutoTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % count;
      setIndex(indexRef.current);
    }, AUTO_ADVANCE_MS);
  }, [count]);

  useEffect(() => {
    startAutoTimer();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoTimer]);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: -index * trackWidth,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, trackWidth, translateX]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    trackWidthRef.current = width;
    setTrackWidth(width);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dx <= -SWIPE_THRESHOLD) goTo(indexRef.current + 1, true);
        else if (gesture.dx >= SWIPE_THRESHOLD) goTo(indexRef.current - 1, true);
      },
      onPanResponderTerminate: () => {},
    })
  ).current;

  return (
    <View style={fill ? styles.wrapFill : styles.wrap}>
      <View style={fill ? styles.viewportRowFill : styles.viewportRow}>
        {arrows && count > 1 && (
          <Pressable
            accessibilityLabel="Bannerul anterior"
            style={({ hovered }) => [styles.navButton, hovered && styles.navButtonHover]}
            onPress={() => goTo(index - 1, true)}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={18} color="#fff" />
          </Pressable>
        )}

        <View style={fill ? styles.viewportFill : styles.viewport} onLayout={onTrackLayout}>
          <View style={styles.viewportTouchLayer} {...panResponder.panHandlers}>
            <Animated.View
              style={[
                styles.track,
                { width: trackWidth * count, transform: [{ translateX }] },
              ]}
            >
              {DEMO_BANNERS.map((banner) => (
                <View key={banner.store} style={[styles.slide, { width: trackWidth, backgroundColor: banner.color }]}>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountBadgeText}>{banner.discount}</Text>
                  </View>
                  <Text style={styles.storeName}>{banner.store}</Text>
                  <Text style={styles.tagline}>{banner.tagline}</Text>
                </View>
              ))}
            </Animated.View>
          </View>
        </View>

        {arrows && count > 1 && (
          <Pressable
            accessibilityLabel="Urmatorul banner"
            style={({ hovered }) => [styles.navButton, hovered && styles.navButtonHover]}
            onPress={() => goTo(index + 1, true)}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </Pressable>
        )}
      </View>

      {count > 1 && (
        <View style={styles.dots}>
          {DEMO_BANNERS.map((banner, i) => (
            <Pressable key={banner.store} onPress={() => goTo(i, true)} hitSlop={6}>
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  wrapFill: {
    flex: 1,
    gap: 10,
  },
  viewportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewportRowFill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  viewport: {
    flex: 1,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    userSelect: 'none' as any,
  },
  viewportFill: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    userSelect: 'none' as any,
  },
  viewportTouchLayer: {
    flex: 1,
  },
  track: {
    flexDirection: 'row',
    height: '100%',
  },
  slide: {
    height: '100%',
    padding: 20,
    justifyContent: 'center',
    gap: 6,
  },
  discountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  storeName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  navButtonHover: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5d5d8',
  },
  dotActive: {
    backgroundColor: '#ff4d6d',
    width: 18,
  },
});
