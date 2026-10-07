import React, { useEffect, useState } from 'react';
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './HomeScreen';
import PartnerStoresScreen from './PartnerStoresScreen';
import StatisticsScreen from './StatisticsScreen';
import MaintenanceScreen from './MaintenanceScreen';
import LegalScreen from './LegalScreen';
import UsersScreen from './UsersScreen';
import SettingsScreen from './SettingsScreen';
import { useTabHistory } from '../../../hooks/useTabHistory';
import { C, S } from '../../../constants/theme';

export type AdminTab =
  | 'home'
  | 'partnerStores'
  | 'statistics'
  | 'maintenance'
  | 'legal'
  | 'users'
  | 'settings';

type TabConfig = {
  id: AdminTab;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconActive: React.ComponentProps<typeof Ionicons>['name'];
};

const TABS: TabConfig[] = [
  { id: 'home',          label: 'Acasă',     icon: 'home-outline',        iconActive: 'home'        },
  { id: 'partnerStores', label: 'Magazine',   icon: 'cart-outline',        iconActive: 'cart'        },
  { id: 'statistics',    label: 'Statistici', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  { id: 'maintenance',   label: 'Mentenanță', icon: 'construct-outline',   iconActive: 'construct'   },
  { id: 'legal',         label: 'Legal',      icon: 'document-text-outline', iconActive: 'document-text' },
  { id: 'users',         label: 'Useri',      icon: 'people-outline',      iconActive: 'people'      },
  { id: 'settings',      label: 'Setări',     icon: 'settings-outline',    iconActive: 'settings'    },
];

type Props = {
  firstName: string;
  lastName?: string;
  onLogout: () => Promise<void> | void;
};

export default function AdminDashboard({ firstName, lastName, onLogout }: Props) {
  const { activeTab, navigateToTab: setActiveTab } = useTabHistory<AdminTab>('home');
  const [partnerStoreSelectedId, setPartnerStoreSelectedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1100;

  useEffect(() => {
    if (isDesktop) setMenuOpen(false);
  }, [isDesktop]);

  const drawerProgress = useSharedValue(0);

  useEffect(() => {
    if (menuOpen) {
      drawerProgress.value = 0;
      drawerProgress.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    }
  }, [menuOpen]);

  const drawerPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (drawerProgress.value - 1) * 280 }],
  }));

  const drawerOverlayStyle = useAnimatedStyle(() => ({
    opacity: drawerProgress.value,
  }));

  const openStore = (storeId: string) => {
    setPartnerStoreSelectedId(storeId);
    setActiveTab('partnerStores');
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen firstName={firstName} lastName={lastName} onOpenStore={openStore} />;
      case 'partnerStores':
        return <PartnerStoresScreen initialSelectedStoreId={partnerStoreSelectedId} />;
      case 'statistics':
        return <StatisticsScreen />;
      case 'maintenance':
        return <MaintenanceScreen />;
      case 'legal':
        return <LegalScreen />;
      case 'users':
        return <UsersScreen />;
      case 'settings':
        return <SettingsScreen onLogout={onLogout} />;
    }
  };

  const renderNavItems = (onNavigate: () => void) => (
    <>
      <View style={styles.drawerList}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                setActiveTab(tab.id);
                onNavigate();
              }}
              style={({ hovered }) => [
                styles.drawerItem,
                isActive && styles.drawerItemActive,
                hovered && !isActive && styles.drawerItemHover,
              ]}
            >
              <Ionicons
                name={isActive ? tab.iconActive : tab.icon}
                size={20}
                color={isActive ? C.accent : '#6b7280'}
              />
              <Text style={[styles.drawerItemText, isActive && styles.drawerItemTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.drawerFooter}>
        <Pressable
          style={({ hovered }) => [
            styles.drawerLogoutButton,
            hovered && styles.drawerLogoutButtonHover,
          ]}
          onPress={() => {
            onNavigate();
            onLogout();
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.drawerLogoutText}>Deconectare</Text>
        </Pressable>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {!isDesktop && (
            <Pressable
              style={({ hovered, pressed }) => [
                styles.menuButton,
                hovered && styles.menuButtonHover,
                pressed && styles.menuButtonPressed,
              ]}
              onPress={() => setMenuOpen(true)}
              hitSlop={8}
            >
              <Ionicons name="menu" size={22} color="#fdf2f4" />
            </Pressable>
          )}

          <Pressable onPress={() => setActiveTab('home')} hitSlop={8}>
            <Text style={styles.headerBrand}>PresentPerfect</Text>
          </Pressable>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.headerGreeting} numberOfLines={1}>
            Salut, {firstName}
          </Text>
          <Pressable
            style={({ hovered, pressed }) => [
              styles.headerLogoutButton,
              hovered && styles.menuButtonHover,
              pressed && styles.menuButtonPressed,
            ]}
            onPress={onLogout}
            hitSlop={8}
          >
            <Ionicons name="log-out-outline" size={18} color="#fdf2f4" />
          </Pressable>
        </View>
      </View>

      <View style={[styles.content, isDesktop && styles.contentRow]}>
        {isDesktop && (
          <View style={styles.sidebarPersistent}>
            {renderNavItems(() => {})}
          </View>
        )}
        <View style={styles.mainContent}>{renderScreen()}</View>
      </View>

      {!isDesktop && (
      <Modal visible={menuOpen} transparent animationType="none" onRequestClose={() => setMenuOpen(false)}>
        <Animated.View style={[styles.drawerOverlay, drawerOverlayStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
        </Animated.View>

        <Animated.View style={[styles.drawerPanel, drawerPanelStyle]}>
          <SafeAreaView style={styles.drawerSafeArea}>
            <View style={styles.drawerHeader}>
              <Text style={styles.headerBrand}>PresentPerfect</Text>
              <Pressable
                style={({ hovered, pressed }) => [
                  styles.drawerCloseButton,
                  hovered && styles.drawerCloseButtonHover,
                  pressed && styles.drawerCloseButtonPressed,
                ]}
                onPress={() => setMenuOpen(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={C.textDim} />
              </Pressable>
            </View>

            {renderNavItems(() => setMenuOpen(false))}
          </SafeAreaView>
        </Animated.View>
      </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content:   { flex: 1 },
  contentRow: { flexDirection: 'row' },
  mainContent: { flex: 1, minWidth: 0 },
  sidebarPersistent: {
    width: 240,
    flexShrink: 0,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#f3f4f6',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#0b0508',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  headerBrand: {
    fontSize: 19,
    fontWeight: '800',
    color: '#fdf2f4',
    letterSpacing: -0.5,
  },
  headerGreeting: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(253,242,244,0.7)',
    maxWidth: 140,
  },
  headerLogoutButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  menuButton: {
    position: 'relative',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  menuButtonHover: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  menuButtonPressed: {
    transform: [{ scale: 0.94 }],
  },

  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,5,8,0.5)',
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 280,
    backgroundColor: '#fff',
    ...S.float,
  },
  drawerSafeArea: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#0b0508',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  drawerCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface2,
  },
  drawerCloseButtonHover: {
    backgroundColor: C.border,
  },
  drawerCloseButtonPressed: {
    transform: [{ scale: 0.94 }],
  },

  drawerList: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 4,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  drawerItemHover: {
    backgroundColor: '#f9fafb',
  },
  drawerItemActive: {
    backgroundColor: C.accentSoft,
  },
  drawerItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  drawerItemTextActive: {
    color: C.accent,
    fontWeight: '700',
  },

  drawerFooter: {
    marginTop: 'auto',
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
  },
  drawerLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  drawerLogoutButtonHover: {
    backgroundColor: '#fef2f2',
  },
  drawerLogoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#dc2626',
  },
});
