import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  firstName: string;
  onLogout: () => void;
};

export default function AdminDashboard({ firstName, onLogout }: Props) {
  return (
    <View style={styles.dashboard}>
      <Text style={styles.heroTitle}>Bine ai venit, {firstName}!</Text>
      <Text style={styles.roleText}>Ești conectat ca Administrator!</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dashboard Admin</Text>
        <Text style={styles.cardText}>
          Aici va apărea zona de management pentru magazine partenere, produse, promoții și statistici.
          Test
        </Text>
      </View>

      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dashboard: {
    gap: 18,
    paddingTop: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  roleText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  cardText: {
    color: '#4b5563',
    lineHeight: 21,
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});