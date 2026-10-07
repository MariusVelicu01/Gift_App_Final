import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '../constants/theme';

type Props = {
  message?: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
};

function formatRo(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MaintenanceBanner({ message, scheduledStart, scheduledEnd }: Props) {
  const range =
    scheduledStart && scheduledEnd
      ? `${formatRo(scheduledStart)} – ${formatRo(scheduledEnd)}`
      : '';

  const text =
    message ||
    (range
      ? `Mentenanță programată: aplicația va fi indisponibilă în perioada ${range}.`
      : 'Urmează o mentenanță programată.');

  return (
    <View style={styles.bar}>
      <Text style={styles.text} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: C.warnBg,
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    fontSize: 12.5,
    fontWeight: '600',
    color: C.warn,
    textAlign: 'center',
  },
});
