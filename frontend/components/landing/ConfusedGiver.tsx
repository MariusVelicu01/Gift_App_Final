import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  size?: number;
  bodyColor?: string;
  bubbleColor?: string;
};

// A small, flat, friendly figure scratching their head over who to gift — three "?"
// thought-bubbles drift up and fade on a staggered loop above them. Kept abstract
// (no face/limbs) to match the gift mascot's simple geometric style rather than
// clashing with it.
export default function ConfusedGiver({ size = 120, bodyColor = '#7c5cff', bubbleColor = '#ff4d6d' }: Props) {
  const head = useSharedValue(0);
  const q1 = useSharedValue(0);
  const q2 = useSharedValue(0);
  const q3 = useSharedValue(0);

  useEffect(() => {
    head.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(6, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    q1.value = withRepeat(
      withSequence(
        withDelay(200, withTiming(1, { duration: 550, easing: Easing.out(Easing.quad) })),
        withDelay(500, withTiming(0, { duration: 450, easing: Easing.in(Easing.quad) })),
        withDelay(300, withTiming(0, { duration: 1 }))
      ),
      -1
    );
    q2.value = withRepeat(
      withSequence(
        withDelay(700, withTiming(1, { duration: 550, easing: Easing.out(Easing.quad) })),
        withDelay(500, withTiming(0, { duration: 450, easing: Easing.in(Easing.quad) })),
        withDelay(0, withTiming(0, { duration: 1 }))
      ),
      -1
    );
    q3.value = withRepeat(
      withSequence(
        withDelay(1200, withTiming(1, { duration: 550, easing: Easing.out(Easing.quad) })),
        withDelay(500, withTiming(0, { duration: 450, easing: Easing.in(Easing.quad) }))
      ),
      -1
    );
  }, []);

  const headStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${head.value}deg` }],
  }));

  const q1Style = useAnimatedStyle(() => ({
    opacity: q1.value,
    transform: [{ translateY: -q1.value * 16 }, { translateX: -size * 0.24 }, { scale: 0.6 + q1.value * 0.5 }],
  }));
  const q2Style = useAnimatedStyle(() => ({
    opacity: q2.value,
    transform: [{ translateY: -q2.value * 20 - 6 }, { scale: 0.6 + q2.value * 0.5 }],
  }));
  const q3Style = useAnimatedStyle(() => ({
    opacity: q3.value,
    transform: [{ translateY: -q3.value * 16 }, { translateX: size * 0.24 }, { scale: 0.6 + q3.value * 0.5 }],
  }));

  const headSize = size * 0.3;
  const bodyWidth = size * 0.44;
  const bodyHeight = size * 0.34;

  return (
    <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
      <Animated.View style={[styles.bubble, q1Style, { backgroundColor: bubbleColor }]}>
        <Text style={styles.bubbleText}>?</Text>
      </Animated.View>
      <Animated.View
        style={[styles.bubble, q2Style, styles.bubbleTop, { backgroundColor: bubbleColor }]}
      >
        <Text style={styles.bubbleText}>?</Text>
      </Animated.View>
      <Animated.View style={[styles.bubble, q3Style, { backgroundColor: bubbleColor }]}>
        <Text style={styles.bubbleText}>?</Text>
      </Animated.View>

      <View style={styles.figure}>
        <Animated.View
          style={[
            styles.head,
            headStyle,
            { width: headSize, height: headSize, borderRadius: headSize / 2, backgroundColor: bodyColor },
          ]}
        />
        <View
          style={[
            styles.body,
            {
              width: bodyWidth,
              height: bodyHeight,
              borderRadius: 18,
              backgroundColor: bodyColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  figure: {
    alignItems: 'center',
  },
  head: {
    marginBottom: -6,
    zIndex: 1,
  },
  body: {
    opacity: 0.95,
  },
  bubble: {
    position: 'absolute',
    top: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleTop: {
    top: -8,
  },
  bubbleText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 14,
  },
});
