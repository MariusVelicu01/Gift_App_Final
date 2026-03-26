import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import HomeScreen from './HomeScreen';
import LovedOnesScreen from './LovedOnesScreen';
import PartnerStoresScreen from './PartnerStoresScreen';
import SettingsScreen from './SettingsScreen';

type ClientTab = 'home' | 'lovedOnes' | 'partnerStores' | 'settings';

type Props = {
  firstName: string;
  onLogout: () => void;
};

export default function ClientDashboard({ firstName, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<ClientTab>('home');

  const currentScreen = useMemo(() => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen firstName={firstName} />;
      case 'lovedOnes':
        return <LovedOnesScreen />;
      case 'partnerStores':
        return <PartnerStoresScreen />;
      case 'settings':
        return <SettingsScreen onLogout={onLogout} />;
      default:
        return <HomeScreen firstName={firstName} />;
    }
  }, [activeTab, firstName, onLogout]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>{currentScreen}</View>

      <View style={styles.bottomNav}>
        <TabButton label="Acasă" isActive={activeTab === 'home'} onPress={() => setActiveTab('home')} />
        <TabButton label="Persoane" isActive={activeTab === 'lovedOnes'} onPress={() => setActiveTab('lovedOnes')} />
        <TabButton label="Magazine" isActive={activeTab === 'partnerStores'} onPress={() => setActiveTab('partnerStores')} />
        <TabButton label="Setări" isActive={activeTab === 'settings'} onPress={() => setActiveTab('settings')} />
      </View>
    </SafeAreaView>
  );
}

function TabButton({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, isActive && styles.tabButtonActive]}>
      <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 500, backgroundColor: '#f9fafb' },
  content: { flex: 1 },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#111827',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
});