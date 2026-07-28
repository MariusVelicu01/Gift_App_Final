import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export type GiftMood = 'idle' | 'success' | 'fail' | 'building';

type Props = {
  mood: GiftMood;
  size?: number;
  boxColor?: string;
  ribbonColor?: string;
  sparkleColor?: string;
};

// One gift box, four moods — the same little character reacts differently depending on
// what just happened in the form next to it: calmly waiting (idle), popping open with a
// sparkle burst (success), shaking "no" without opening (fail), or looping a wrap/tie
// motion while an account is being put together (building). All hand-built from Views +
// Reanimated, no external asset.
export default function GiftMascot({
  mood,
  size = 120,
  boxColor = '#be123c',
  ribbonColor = '#fde68a',
  sparkleColor = '#ff4d6d',
}: Props) {
  const lidRotate = useSharedValue(0);
  const bounceY = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const ribbonWrap = useSharedValue(1);
  const sparkle1 = useSharedValue(0);
  const sparkle2 = useSharedValue(0);
  const sparkle3 = useSharedValue(0);
  const sparkle4 = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(lidRotate);
    cancelAnimation(bounceY);
    cancelAnimation(shakeX);
    cancelAnimation(ribbonWrap);
    cancelAnimation(sparkle1);
    cancelAnimation(sparkle2);
    cancelAnimation(sparkle3);
    cancelAnimation(sparkle4);

    if (mood === 'idle') {
      lidRotate.value = withTiming(0, { duration: 250 });
      shakeX.value = withTiming(0, { duration: 200 });
      ribbonWrap.value = withTiming(1, { duration: 250 });
      bounceY.value = withRepeat(
        withSequence(
          withTiming(-6, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) })
        ),
        -1
      );
      return;
    }

    if (mood === 'success') {
      shakeX.value = 0;
      ribbonWrap.value = 1;
      lidRotate.value = withSequence(
        withTiming(-88, { duration: 480, easing: Easing.out(Easing.back(1.8)) }),
        withDelay(250, withTiming(-72, { duration: 320, easing: Easing.inOut(Easing.quad) }))
      );
      bounceY.value = withSequence(
        withTiming(-16, { duration: 260, easing: Easing.out(Easing.quad) }),
        withSpring(0, { damping: 6, stiffness: 140 })
      );
      sparkle1.value = withDelay(
        150,
        withSequence(withTiming(1, { duration: 280 }), withTiming(0, { duration: 420 }))
      );
      sparkle2.value = withDelay(
        220,
        withSequence(withTiming(1, { duration: 280 }), withTiming(0, { duration: 420 }))
      );
      sparkle3.value = withDelay(
        260,
        withSequence(withTiming(1, { duration: 280 }), withTiming(0, { duration: 420 }))
      );
      sparkle4.value = withDelay(
        320,
        withSequence(withTiming(1, { duration: 280 }), withTiming(0, { duration: 420 }))
      );
      return;
    }

    if (mood === 'fail') {
      lidRotate.value = withSequence(
        withTiming(-6, { duration: 90 }),
        withTiming(4, { duration: 90 }),
        withTiming(0, { duration: 90 })
      );
      shakeX.value = withSequence(
        withTiming(-10, { duration: 70 }),
        withTiming(10, { duration: 70 }),
        withTiming(-8, { duration: 70 }),
        withTiming(8, { duration: 70 }),
        withTiming(-4, { duration: 70 }),
        withTiming(0, { duration: 70 })
      );
      bounceY.value = withSequence(
        withTiming(4, { duration: 90 }),
        withTiming(0, { duration: 160 })
      );
      return;
    }

    // building
    lidRotate.value = withTiming(0, { duration: 250 });
    shakeX.value = withTiming(0, { duration: 200 });
    ribbonWrap.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withDelay(150, withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) })),
        withDelay(900, withTiming(1, { duration: 1 }))
      ),
      -1
    );
    bounceY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, [mood]);

  const boxWrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceY.value }, { translateX: shakeX.value }],
  }));

  const lidStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${lidRotate.value}deg` }],
  }));

  const ribbonStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: ribbonWrap.value }],
    opacity: 0.4 + ribbonWrap.value * 0.6,
  }));

  const sparkleStyle1 = useAnimatedStyle(() => ({
    opacity: sparkle1.value,
    transform: [
      { translateX: -sparkle1.value * size * 0.34 },
      { translateY: -sparkle1.value * size * 0.32 },
      { scale: 0.4 + sparkle1.value * 0.8 },
    ],
  }));
  const sparkleStyle2 = useAnimatedStyle(() => ({
    opacity: sparkle2.value,
    transform: [
      { translateX: sparkle2.value * size * 0.1 },
      { translateY: -sparkle2.value * size * 0.42 },
      { scale: 0.4 + sparkle2.value * 0.8 },
    ],
  }));
  const sparkleStyle3 = useAnimatedStyle(() => ({
    opacity: sparkle3.value,
    transform: [
      { translateX: sparkle3.value * size * 0.36 },
      { translateY: -sparkle3.value * size * 0.3 },
      { scale: 0.4 + sparkle3.value * 0.8 },
    ],
  }));
  const sparkleStyle4 = useAnimatedStyle(() => ({
    opacity: sparkle4.value,
    transform: [
      { translateX: -sparkle4.value * size * 0.08 },
      { translateY: -sparkle4.value * size * 0.48 },
      { scale: 0.4 + sparkle4.value * 0.8 },
    ],
  }));

  const boxWidth = size * 0.62;
  const boxHeight = size * 0.42;
  const lidHeight = size * 0.15;
  const lidWidth = boxWidth * 1.14;

  return (
    <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
      <Animated.View style={[styles.sparkle, sparkleStyle1, { backgroundColor: sparkleColor }]} />
      <Animated.View
        style={[styles.sparkle, sparkleStyle2, { backgroundColor: sparkleColor, width: 7, height: 7 }]}
      />
      <Animated.View style={[styles.sparkle, sparkleStyle3, { backgroundColor: sparkleColor }]} />
      <Animated.View
        style={[styles.sparkle, sparkleStyle4, { backgroundColor: sparkleColor, width: 6, height: 6 }]}
      />

      <Animated.View
        style={[styles.boxWrap, boxWrapStyle, { width: boxWidth, height: boxHeight + lidHeight }]}
      >
        <Animated.View
          style={[
            styles.lid,
            lidStyle,
            {
              width: lidWidth,
              height: lidHeight,
              backgroundColor: boxColor,
              transformOrigin: 'bottom center' as any,
            },
          ]}
        >
          <View style={[styles.lidKnot, { backgroundColor: ribbonColor }]} />
        </Animated.View>

        <View style={[styles.box, { width: boxWidth, height: boxHeight, backgroundColor: boxColor }]}>
          <Animated.View style={[styles.ribbonVertical, ribbonStyle, { backgroundColor: ribbonColor }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxWrap: {
    alignItems: 'center',
  },
  lid: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lidKnot: {
    width: 18,
    height: 12,
    borderRadius: 6,
  },
  box: {
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    alignItems: 'center',
    overflow: 'hidden',
  },
  ribbonVertical: {
    position: 'absolute',
    width: 12,
    height: '100%',
  },
  sparkle: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
  },
});
