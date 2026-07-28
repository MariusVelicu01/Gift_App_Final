import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextStyle, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  text: string;
  textStyle?: TextStyle;
  backgroundColor?: string;
  pxPerSecond?: number;
};

// Infinite horizontal ticker — the Cuberto-style "marquee strip". Two copies of the
// text sit side by side and slide left together; the moment the first copy fully exits,
// the second one is already sitting exactly where the first started, so the reset to 0
// is invisible and the loop reads as continuous.
export default function Marquee({ text, textStyle, backgroundColor, pxPerSecond = 70 }: Props) {
  const [copyWidth, setCopyWidth] = useState(0);
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (!copyWidth) return;
    translateX.value = 0;
    translateX.value = withRepeat(
      withTiming(-copyWidth, {
        duration: (copyWidth / pxPerSecond) * 1000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [copyWidth, pxPerSecond]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.container, backgroundColor ? { backgroundColor } : null]}>
      <Animated.View style={[styles.row, animatedStyle]}>
        <Text
          style={[styles.text, textStyle]}
          numberOfLines={1}
          onLayout={(e) => setCopyWidth(e.nativeEvent.layout.width)}
        >
          {text}
        </Text>
        <Text style={[styles.text, textStyle]} numberOfLines={1}>
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
  },
  text: {
    flexShrink: 0,
  },
});
