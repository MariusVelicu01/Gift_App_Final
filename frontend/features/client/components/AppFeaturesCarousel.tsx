import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Same marketing copy as the landing page's feature cards (app/index.tsx FEATURES) —
// kept in sync rather than invented separately, so this carousel pitches the app with
// the same verified claims shown to guests before they sign up.
const FEATURES = [
  {
    title: 'Alerte de preț',
    desc: 'Te anunțăm instant când prețul scade — prinde mereu cea mai bună ofertă pentru cadoul perfect.',
    accent: '#ff4d6d',
    icon: 'pricetag-outline' as const,
  },
  {
    title: 'Persoane dragi',
    desc: 'Preferințe, zile de naștere, cadouri istorice — totul organizat elegant pentru fiecare persoană din viața ta.',
    accent: '#2dd4bf',
    icon: 'people-outline' as const,
  },
  {
    title: 'GiftBot AI',
    desc: 'Fără inspirație? Descrie persoana și bugetul — GiftBot-ul îți sugerează cadoul perfect în câteva secunde.',
    accent: '#a78bfa',
    icon: 'sparkles-outline' as const,
  },
];

const AUTO_ADVANCE_MS = 4500;
const SWIPE_THRESHOLD = 40;

type Props = {
  // Hides the prev/next buttons while keeping the swipe/drag gesture — for spots
  // where the arrows would visually clash with the surrounding card.
  arrows?: boolean;
};

export default function AppFeaturesCarousel({ arrows = true }: Props = {}) {
  const count = FEATURES.length;
  const [index, setIndex] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const translateX = useRef(new Animated.Value(0)).current;

  const startAutoTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % count;
      setIndex(indexRef.current);
    }, AUTO_ADVANCE_MS);
  }, [count]);

  const goTo = useCallback((next: number, manual: boolean) => {
    const clamped = ((next % count) + count) % count;
    indexRef.current = clamped;
    setIndex(clamped);
    if (manual) startAutoTimer();
  }, [count, startAutoTimer]);

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
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dx <= -SWIPE_THRESHOLD) goTo(indexRef.current + 1, true);
        else if (gesture.dx >= SWIPE_THRESHOLD) goTo(indexRef.current - 1, true);
      },
    })
  ).current;

  return (
    <View style={styles.wrap}>
      <View style={styles.viewport} onLayout={onTrackLayout} {...panResponder.panHandlers}>
        <Animated.View style={[styles.track, { width: trackWidth * count, transform: [{ translateX }] }]}>
          {FEATURES.map((feature) => (
            <View key={feature.title} style={[styles.slide, { width: trackWidth }]}>
              <View style={[styles.iconBadge, { backgroundColor: `${feature.accent}26` }]}>
                <Ionicons name={feature.icon} size={26} color={feature.accent} />
              </View>
              <Text style={[styles.featureTitle, { color: feature.accent }]}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </View>
          ))}
        </Animated.View>

        {arrows && count > 1 && (
          <>
            <Pressable
              accessibilityLabel="Atributul anterior"
              style={({ hovered }) => [styles.navButton, styles.navButtonLeft, hovered && styles.navButtonHover]}
              onPress={() => goTo(index - 1, true)}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={16} color="#fff" />
            </Pressable>
            <Pressable
              accessibilityLabel="Urmatorul atribut"
              style={({ hovered }) => [styles.navButton, styles.navButtonRight, hovered && styles.navButtonHover]}
              onPress={() => goTo(index + 1, true)}
              hitSlop={8}
            >
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </Pressable>
          </>
        )}
      </View>

      {count > 1 && (
        <View style={styles.dots}>
          {FEATURES.map((feature, i) => (
            <Pressable
              key={feature.title}
              onPress={() => goTo(i, true)}
              hitSlop={6}
              style={({ hovered }) => hovered && styles.dotHovered}
            >
              <View style={[styles.dot, i === index && [styles.dotActive, { backgroundColor: feature.accent }]]} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: 8,
  },
  viewport: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  track: {
    flexDirection: 'row',
    height: '100%',
  },
  slide: {
    height: '100%',
    padding: 28,
    justifyContent: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  featureDesc: {
    color: 'rgba(253,242,244,0.65)',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    cursor: 'pointer' as any,
    transitionProperty: 'transform, background-color' as any,
    transitionDuration: '160ms' as any,
    transitionTimingFunction: 'ease-out' as any,
  },
  navButtonHover: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    transform: [{ scale: 1.12 }],
  },
  navButtonLeft: {
    left: 6,
  },
  navButtonRight: {
    right: 6,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    transitionProperty: 'width, background-color, transform' as any,
    transitionDuration: '160ms' as any,
    transitionTimingFunction: 'ease-out' as any,
  },
  dotActive: {
    width: 18,
  },
  dotHovered: {
    transform: [{ scale: 1.4 }],
  },
});
