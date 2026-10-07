import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '../constants/theme';

type Props = {
  message?: string | null;
};

const DEFAULT_MESSAGE =
  'Facem câteva îmbunătățiri și revenim imediat. Îți mulțumim pentru răbdare.';

export default function MaintenanceBlock({ message }: Props) {
  return (
    <View style={styles.centerBlock}>
      <Text style={styles.icon}>🛠️</Text>
      <Text style={styles.title}>Mentenanță în desfășurare</Text>
      <Text style={styles.text}>{message || DEFAULT_MESSAGE}</Text>
      <Text style={styles.hint}>Pagina se actualizează automat imediat ce revenim.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 14,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
  },
  text: {
    fontSize: 15,
    color: C.textDim,
    textAlign: 'center',
    maxWidth: 340,
    lineHeight: 22,
  },
  hint: {
    fontSize: 13,
    color: C.textFaint,
    textAlign: 'center',
    maxWidth: 320,
  },
});
