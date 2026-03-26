import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import HomeScreen from './HomeScreen';
import PartnerStoresScreen from './PartnerStoresScreen';
import StatisticsScreen from './StatisticsScreen';
import SettingsScreen from './SettingsScreen';

type AdminTab = 'home' | 'partnerStores' | 'statistics' | 'settings';

type Props = {
  firstName: string;
  onLogout: () => Promise<void> | void;
};

export default function AdminDashboard({ firstName, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<AdminTab>('home');

  const currentScreen = useMemo(() => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen firstName={firstName} />;

      case 'partnerStores':
        return <PartnerStoresScreen />;

      case 'statistics':
        return <StatisticsScreen />;

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
        <TabButton
          label="Acasă"
          isActive={activeTab === 'home'}
          onPress={() => setActiveTab('home')}
        />
        <TabButton
          label="Magazine"
          isActive={activeTab === 'partnerStores'}
          onPress={() => setActiveTab('partnerStores')}
        />
        <TabButton
          label="Statistici"
          isActive={activeTab === 'statistics'}
          onPress={() => setActiveTab('statistics')}
        />
        <TabButton
          label="Setări"
          isActive={activeTab === 'settings'}
          onPress={() => setActiveTab('settings')}
        />
      </View>
    </SafeAreaView>
  );
}

type TabButtonProps = {
  label: string;
  isActive: boolean;
  onPress: () => void;
};

function TabButton({ label, isActive, onPress }: TabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
    >
      <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#ffffff',
  },
});