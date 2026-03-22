import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AuthModal from '../../components/AuthModal';
import { useAuth } from '../../src/context/AuthContext';
import ClientDashboard from '../../src/features/client/screens/ClientDashboard';
import AdminDashboard from '../../src/features/admin//screens/AdminDashboard';

function GuestHome({ onOpenAuth }: { onOpenAuth: () => void }) {
  return (
    <View style={styles.centerBlock}>
      <Text style={styles.heroTitle}>Bine ai venit!</Text>
      <Text style={styles.heroSubtitle}>Nu sunteți conectat.</Text>

      <Pressable style={styles.ctaButton} onPress={onOpenAuth}>
        <Text style={styles.ctaButtonText}>Login / Create Account</Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const { loading, profile, logout } = useAuth();
  const [authModalVisible, setAuthModalVisible] = useState(false);

  const headerButtonLabel = useMemo(() => {
    if (!profile) return 'Login / Create Account';
    return `${profile.firstName} (${profile.role})`;
  }, [profile]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.appName}>Gift Affiliate App</Text>

        {!profile ? (
          <Pressable
            style={styles.topBarButton}
            onPress={() => setAuthModalVisible(true)}
          >
            <Text style={styles.topBarButtonText}>{headerButtonLabel}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.topBarButton} onPress={handleLogout}>
            <Text style={styles.topBarButtonText}>Logout</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Se încarcă sesiunea...</Text>
          </View>
        ) : !profile ? (
          <GuestHome onOpenAuth={() => setAuthModalVisible(true)} />
        ) : profile.role === 'client' ? (
          <ClientDashboard firstName={profile.firstName} onLogout={handleLogout} />
        ) : (
          <AdminDashboard firstName={profile.firstName} onLogout={handleLogout} />
        )}
      </ScrollView>

      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  topBarButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  topBarButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 17,
    color: '#4b5563',
    textAlign: 'center',
  },
  ctaButton: {
    marginTop: 22,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  ctaButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  loadingText: {
    marginTop: 12,
    color: '#4b5563',
    fontSize: 15,
  },
});