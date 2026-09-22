import React, { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  style: any;
  driftX?: number;
  driftY?: number;
  duration?: number;
};

// Soft glow that drifts back and forth in a slow sine-like loop — used as ambient
// background motion behind dark PresentPerfect brand panels (landing hero, home
// brand strip, loved-ones sidebar).
export default function DriftBlob({ style, driftX = 18, driftY = 14, duration = 6000 }: Props) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * driftX }, { translateY: t.value * driftY }],
  }));

  return <Animated.View style={[style, animatedStyle]} pointerEvents="none" />;
}
