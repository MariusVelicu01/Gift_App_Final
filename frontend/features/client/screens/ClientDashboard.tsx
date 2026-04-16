import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import HomeScreen from './HomeScreen';
import LovedOnesScreen from './LovedOnesScreen';
import CalendarScreen from './CalendarScreen';
import PartnerStoresScreen from './PartnerStoresScreen';
import SettingsScreen from './SettingsScreen';

type ClientTab = 'home' | 'lovedOnes' | 'calendar' | 'partnerStores' | 'settings';

type Props = {
  firstName: string;
  onLogout: () => void;
};

const TABS: { id: ClientTab; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Acasa' },
  { id: 'lovedOnes', icon: '🎁', label: 'Persoane' },
  { id: 'calendar', icon: '📅', label: 'Calendar' },
  { id: 'partnerStores', icon: '🛍️', label: 'Magazine' },
  { id: 'settings', icon: '⚙️', label: 'Setari' },
];

export default function ClientDashboard({ firstName, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<ClientTab>('home');
  const { width } = useWindowDimensions();
  const isWide = width >= 760;

  const currentScreen = useMemo(() => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen firstName={firstName} />;
      case 'lovedOnes':
        return <LovedOnesScreen />;
      case 'calendar':
        return <CalendarScreen />;
      case 'partnerStores':
        return <PartnerStoresScreen />;
      case 'settings':
        return <SettingsScreen onLogout={onLogout} />;
      default:
        return <HomeScreen firstName={firstName} />;
    }
  }, [activeTab, firstName, onLogout]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={[styles.container, isWide && styles.containerWide]}>
        <View style={styles.content}>{currentScreen}</View>

        <View style={styles.bottomNav}>
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              isActive={activeTab === tab.id}
              onPress={() => setActiveTab(tab.id)}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function TabButton({
  icon,
  label,
  isActive,
  onPress,
}: {
  icon: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.tabButton,
        hovered && styles.tabButtonHover,
        pressed && styles.tabButtonPressed,
        isActive && styles.tabButtonActive,
      ]}
    >
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff7ed',
  },
  container: {
    flex: 1,
    width: '100%',
    minHeight: 500,
    backgroundColor: '#fff7ed',
  },
  containerWide: {},
  content: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#fce7e0',
    backgroundColor: '#ffffff',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 4,
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    gap: 3,
  },
  tabButtonHover: {
    backgroundColor: '#fff1f2',
  },
  tabButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  tabButtonActive: {
    backgroundColor: '#be123c',
  },
  tabIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
