import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type Props = {
  children: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// A "magnetic" pill button: scales up slightly on web hover, springs down on press,
// and settles back with a soft overshoot — the small, tactile detail Cuberto-style
// sites use on every CTA. onHoverIn/Out are web-only RN Pressable events; they simply
// never fire on iOS/Android, so press feedback still works everywhere.
export default function MagneticButton({ children, onPress, style, disabled }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onHoverIn={() => {
        if (!disabled) scale.value = withSpring(1.045, { damping: 10, stiffness: 180 });
      }}
      onHoverOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 180 });
      }}
      onPressIn={() => {
        if (!disabled) scale.value = withSpring(0.95, { damping: 14, stiffness: 220 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 10, stiffness: 180 });
      }}
      style={[style, animatedStyle, disabled && styles.disabled]}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = { disabled: { opacity: 0.5 } } as const;
