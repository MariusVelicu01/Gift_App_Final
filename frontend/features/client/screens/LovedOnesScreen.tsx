import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function LovedOnesScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Persoane Dragi</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profiluri salvate</Text>
        <Text style={styles.cardText}>
          Aici vei putea salva persoane, preferințe și ocazii speciale.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#111827' },
  cardText: { fontSize: 15, lineHeight: 22, color: '#374151' },
});