import type { GestureResponderEvent } from 'react-native';

export function getModalBackdropResponder(onClose: () => void) {
  return {
    onStartShouldSetResponder: () => true,
    onResponderRelease: (event: GestureResponderEvent) => {
      if ((event as any).target === (event as any).currentTarget) {
        onClose();
      }
    },
  };
}
