import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SettingsScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Setări</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cont</Text>
        <Text style={styles.cardText}>
          Aici vei putea modifica setările contului și preferințele aplicației.
        </Text>
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
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
  cardText: { fontSize: 15, lineHeight: 22, color: '#374151', marginBottom: 14 },
  logoutButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});