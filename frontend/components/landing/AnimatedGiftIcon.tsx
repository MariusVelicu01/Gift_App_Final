import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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
  boxColor?: string;
  ribbonColor?: string;
  sparkleColor?: string;
};

// A small self-contained "gift unboxing" loop built from plain Views + Reanimated —
// no external asset required. The lid pops open on its bottom edge, the box gives a
// soft bounce, and three sparkles twinkle around it, all looping with staggered pauses
// so it reads as a living illustration rather than a spinner.
export default function AnimatedGiftIcon({
  size = 220,
  boxColor = '#be123c',
  ribbonColor = '#fde68a',
  sparkleColor = '#fde68a',
}: Props) {
  const lidRotate = useSharedValue(0);
  const boxBounce = useSharedValue(0);
  const sparkleA = useSharedValue(0);
  const sparkleB = useSharedValue(0);
  const sparkleC = useSharedValue(0);

  useEffect(() => {
    lidRotate.value = withRepeat(
      withSequence(
        withDelay(500, withTiming(-24, { duration: 550, easing: Easing.out(Easing.back(1.6)) })),
        withDelay(650, withTiming(0, { duration: 450, easing: Easing.inOut(Easing.quad) })),
        withDelay(1500, withTiming(0, { duration: 1 }))
      ),
      -1
    );

    boxBounce.value = withRepeat(
      withSequence(
        withDelay(500, withTiming(-8, { duration: 550, easing: Easing.out(Easing.quad) })),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.quad) }),
        withDelay(1600, withTiming(0, { duration: 1 }))
      ),
      -1
    );

    sparkleA.value = withRepeat(
      withSequence(
        withDelay(300, withTiming(1, { duration: 650 })),
        withTiming(0, { duration: 650 }),
        withDelay(1300, withTiming(0, { duration: 1 }))
      ),
      -1
    );
    sparkleB.value = withRepeat(
      withSequence(
        withDelay(950, withTiming(1, { duration: 650 })),
        withTiming(0, { duration: 650 }),
        withDelay(650, withTiming(0, { duration: 1 }))
      ),
      -1
    );
    sparkleC.value = withRepeat(
      withSequence(
        withDelay(1400, withTiming(1, { duration: 650 })),
        withTiming(0, { duration: 650 }),
        withDelay(200, withTiming(0, { duration: 1 }))
      ),
      -1
    );
  }, []);

  const lidStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${lidRotate.value}deg` }],
  }));

  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: boxBounce.value }],
  }));

  const sparkleAStyle = useAnimatedStyle(() => ({
    opacity: sparkleA.value,
    transform: [{ translateY: -sparkleA.value * 16 }, { scale: 0.5 + sparkleA.value * 0.7 }],
  }));
  const sparkleBStyle = useAnimatedStyle(() => ({
    opacity: sparkleB.value,
    transform: [{ translateY: -sparkleB.value * 12 }, { scale: 0.5 + sparkleB.value * 0.7 }],
  }));
  const sparkleCStyle = useAnimatedStyle(() => ({
    opacity: sparkleC.value,
    transform: [{ translateY: -sparkleC.value * 14 }, { scale: 0.5 + sparkleC.value * 0.7 }],
  }));

  const boxHeight = size * 0.5;
  const boxWidth = size * 0.62;
  const lidHeight = size * 0.16;
  const lidWidth = boxWidth * 1.14;

  return (
    <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.sparkle,
          sparkleAStyle,
          { left: size * 0.12, top: size * 0.28, backgroundColor: sparkleColor },
        ]}
      />
      <Animated.View
        style={[
          styles.sparkle,
          sparkleBStyle,
          { right: size * 0.1, top: size * 0.18, backgroundColor: sparkleColor, width: 8, height: 8 },
        ]}
      />
      <Animated.View
        style={[
          styles.sparkle,
          sparkleCStyle,
          { right: size * 0.22, bottom: size * 0.18, backgroundColor: sparkleColor },
        ]}
      />

      <Animated.View style={[styles.boxWrap, boxStyle, { width: boxWidth, height: boxHeight + lidHeight }]}>
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
          <View style={[styles.ribbonVertical, { backgroundColor: ribbonColor }]} />
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lidKnot: {
    width: 22,
    height: 14,
    borderRadius: 7,
  },
  box: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    alignItems: 'center',
    overflow: 'hidden',
  },
  ribbonVertical: {
    position: 'absolute',
    width: 14,
    height: '100%',
  },
  sparkle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
