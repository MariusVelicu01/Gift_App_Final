import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LEGAL_CONTACT_EMAIL } from '../constants/legalContent';
import { C, R } from '../constants/theme';

const TITLE = 'Contul tău a fost blocat';
const MESSAGE = `Accesul la acest cont a fost suspendat. Dacă crezi că este o greșeală, te rugăm să ne contactezi la ${LEGAL_CONTACT_EMAIL}.`;

export default function AccountBlockedScreen() {
  const { logout } = useAuth();

  return (
    <View style={styles.centerBlock}>
      <Text style={styles.icon}>🚫</Text>
      <Text style={styles.title}>{TITLE}</Text>
      <Text style={styles.text}>{MESSAGE}</Text>

      <Pressable style={styles.logoutButton} onPress={() => logout()}>
        <Text style={styles.logoutButtonText}>Deconectare</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
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
    maxWidth: 360,
    lineHeight: 22,
  },
  logoutButton: {
    marginTop: 8,
    backgroundColor: C.accent,
    borderRadius: R.pill,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
