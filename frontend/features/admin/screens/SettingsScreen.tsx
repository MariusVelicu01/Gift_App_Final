import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  onLogout: () => Promise<void> | void;
};

export default function SettingsScreen({ onLogout }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Setări</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cont administrator</Text>
        <Text style={styles.cardText}>
          Aici vei putea modifica informațiile contului și preferințele aplicației.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Configurări aplicație</Text>
        <Text style={styles.cardText}>
          În viitor vei putea gestiona notificările, permisiunile și setările generale.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sesiune</Text>

        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 12,
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});