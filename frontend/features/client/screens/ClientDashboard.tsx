import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './HomeScreen';
import LovedOnesScreen from './LovedOnesScreen';
import CalendarScreen from './CalendarScreen';
import PartnerStoresScreen from './PartnerStoresScreen';
import NotificationsScreen from './NotificationsScreen';
import SettingsScreen from './SettingsScreen';
import { useAuth } from '../../../context/AuthContext';
import { C, S } from '../../../constants/theme';
import { AppNotification, DeadlineAlert, PriceAlert, PriceAlertTarget } from '../../../types/priceAlerts';
import {
  deletePriceAlerts,
  getPriceAlerts,
  markAllPriceAlertsRead,
  markPriceAlertRead,
} from '../../../services/priceAlertsApi';
import {
  generateBirthdayAlerts,
  markBirthdayAlertRead,
} from '../../../services/birthdayAlertsService';
import {
  generateDeadlineAlerts,
  markDeadlineAlertRead,
} from '../../../services/deadlineAlertsService';
import { generatePriceChangeAlerts, markObserverAlertRead } from '../../../services/priceChangeObserver';
import { getLovedOnesCache } from '../../../services/lovedOnesCache';
import { getCalendarCache } from '../../../services/calendarCache';
import {
  getPartnerStoresCache,
  isPartnerStoresCacheStale,
  refreshPartnerStoresCacheInBackground,
  subscribePartnerStoresCache,
} from '../../../services/partnerStoresCache';
import {
  registerPushToken,
  addNotificationResponseListener,
} from '../../../services/pushNotificationsService';
import { track, Events } from '../../../services/analytics';

export type ClientTab = 'home' | 'lovedOnes' | 'calendar' | 'partnerStores' | 'notifications' | 'settings';

type TabConfig = {
  id: ClientTab;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconActive: React.ComponentProps<typeof Ionicons>['name'];
};

const TABS: TabConfig[] = [
  { id: 'home',          label: 'Acasă',     icon: 'home-outline',          iconActive: 'home'          },
  { id: 'lovedOnes',     label: 'Persoane',   icon: 'gift-outline',          iconActive: 'gift'          },
  { id: 'calendar',      label: 'Calendar',   icon: 'calendar-outline',      iconActive: 'calendar'      },
  { id: 'partnerStores', label: 'Magazine',   icon: 'cart-outline',          iconActive: 'cart'          },
  { id: 'notifications', label: 'Notificari', icon: 'notifications-outline', iconActive: 'notifications' },
  { id: 'settings',      label: 'Setari',     icon: 'settings-outline',      iconActive: 'settings'      },
];

type Props = {
  firstName: string;
  lastName?: string;
  userGender?: string;
  onLogout: () => void;
};

export default function ClientDashboard({ firstName, lastName, userGender, onLogout }: Props) {
  const { token, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<ClientTab>('home');
  const [alerts, setAlerts] = useState<AppNotification[]>([]);
  const [priceAlertTarget, setPriceAlertTarget] = useState<PriceAlertTarget | null>(null);
  const [giftDetailsTarget, setGiftDetailsTarget] = useState<{ lovedOneId: string; giftPlanId: string } | null>(null);
  const [settingsPersonalDataOpen, setSettingsPersonalDataOpen] = useState(false);
  const [settingsNotificationsOpen, setSettingsNotificationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1100;

  const calendarResetRef  = useRef<(() => void) | null>(null);
  const lovedOnesResetRef = useRef<(() => void) | null>(null);

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

  useEffect(() => {
    if (!token) return;
    registerPushToken(token);
    const sub = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as any;
      track(Events.NOTIFICATION_OPENED, { kind: data?.kind });
      if (data?.kind === 'price_alert') setActiveTab('notifications');
      else if (data?.kind === 'birthday' || data?.kind === 'deadline') setActiveTab('notifications');
    });
    return () => sub.remove();
  }, [token]);

  const loadAlerts = useCallback(async () => {
    if (!token) return;

    const priceAlerts = await getPriceAlerts(token).catch(() => [] as any[]);

    let deadlineAlerts: any[] = [];
    let birthdayAlerts: any[] = [];
    let observedPriceAlerts: any[] = [];
    try {
      const [lovedOnes, calendarData, stores] = await Promise.all([
        getLovedOnesCache(token),
        getCalendarCache(token),
        getPartnerStoresCache(token),
      ]);
      const [bAlerts, dAlerts, obsAlerts] = await Promise.all([
        generateBirthdayAlerts(lovedOnes).catch(() => []),
        generateDeadlineAlerts(calendarData).catch(() => []),
        generatePriceChangeAlerts(calendarData, stores).catch(() => []),
      ]);
      birthdayAlerts = bAlerts;
      deadlineAlerts = dAlerts;
      observedPriceAlerts = obsAlerts;
    } catch {}

    setAlerts([...priceAlerts, ...observedPriceAlerts, ...deadlineAlerts, ...birthdayAlerts]);
  }, [token, profile]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  useEffect(() => {
    if (!token) return;
    return subscribePartnerStoresCache(() => { loadAlerts(); });
  }, [token, loadAlerts]);

  useEffect(() => {
    if (!token) return;

    const handleAppStateChange = async (nextState: string) => {
      if (nextState !== 'active') return;

      if (isPartnerStoresCacheStale()) {
        refreshPartnerStoresCacheInBackground(token);
      }

      try {
        const [calendarData, stores] = await Promise.all([
          getCalendarCache(token),
          getPartnerStoresCache(token),
        ]);
        const newPriceAlerts = await generatePriceChangeAlerts(calendarData, stores).catch(() => []);
        if (newPriceAlerts.length > 0) {
          setAlerts((prev) => {
            const existingIds = new Set(prev.map((a) => a.id));
            const novel = newPriceAlerts.filter((a) => !existingIds.has(a.id));
            return novel.length > 0 ? [...novel, ...prev] : prev;
          });
        }
      } catch {}
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [token]);

  const unreadCount = alerts.filter((a) => !a.readAt).length;

  const handleOpenAlert = useCallback(async (alert: AppNotification) => {
    if (!alert.readAt) {
      const kind = (alert as any).notificationKind;
      if (kind === 'birthday') {
        await markBirthdayAlertRead(alert.id);
      } else if (kind === 'deadline') {
        await markDeadlineAlertRead(alert.id);
      } else if (alert.id.startsWith('price-obs-')) {
        await markObserverAlertRead(alert.id);
      } else if (token) {
        await markPriceAlertRead(token, alert.id);
      }
      setAlerts((prev) =>
        prev.map((a) => a.id === alert.id ? { ...a, readAt: new Date().toISOString() } : a)
      );
    }
    const kind = (alert as any).notificationKind;
    if ((alert as PriceAlert).productId) {
      setPriceAlertTarget({ alert: alert as PriceAlert });
      setActiveTab('lovedOnes');
    } else if (kind === 'deadline') {
      const da = alert as DeadlineAlert;
      setGiftDetailsTarget({ lovedOneId: da.lovedOneId, giftPlanId: da.giftPlanId });
      setActiveTab('lovedOnes');
    } else if (kind === 'birthday') {
      setActiveTab('lovedOnes');
    }
  }, [token]);

  const handleMarkAllRead = useCallback(async () => {
    if (!token) return;
    const now = new Date().toISOString();
    await markAllPriceAlertsRead(token);
    setAlerts((prev) =>
      prev.map((a) => {
        if (a.readAt) return a;
        const kind = (a as any).notificationKind;
        if (kind === 'birthday') markBirthdayAlertRead(a.id);
        else if (kind === 'deadline') markDeadlineAlertRead(a.id);
        else if (a.id.startsWith('price-obs-')) markObserverAlertRead(a.id);
        return { ...a, readAt: now };
      })
    );
  }, [token]);

  const handleDeleteAlerts = useCallback(async (mode: 'read' | 'all') => {
    if (!token) return;
    const remaining = await deletePriceAlerts(token, mode);
    setAlerts((prev) => {
      const local = prev.filter((a) => {
        const kind = (a as any).notificationKind;
        return kind === 'birthday' || kind === 'deadline' || a.id.startsWith('price-obs-');
      });
      const localToKeep = mode === 'all' ? [] : local.filter((a) => !a.readAt);
      return [...remaining, ...localToKeep];
    });
  }, [token]);

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            firstName={firstName}
            lastName={lastName}
            userGender={userGender}
            onOpenGift={(target) => {
              setGiftDetailsTarget(target);
              setActiveTab('lovedOnes');
            }}
            onNavigateTab={setActiveTab}
          />
        );
      case 'lovedOnes':
        return (
          <LovedOnesScreen
            priceAlertTarget={priceAlertTarget}
            onPriceAlertTargetConsumed={() => setPriceAlertTarget(null)}
            giftDetailsTarget={giftDetailsTarget}
            onGiftDetailsTargetConsumed={() => setGiftDetailsTarget(null)}
            resetRef={lovedOnesResetRef}
            onNavigateTab={setActiveTab}
          />
        );
      case 'calendar':
        return <CalendarScreen resetRef={calendarResetRef} onNavigateTab={setActiveTab} />;
      case 'partnerStores':
        return <PartnerStoresScreen userGender={userGender} onNavigateTab={setActiveTab} />;
      case 'notifications':
        return (
          <NotificationsScreen
            alerts={alerts}
            onOpenAlert={handleOpenAlert}
            onMarkAllRead={handleMarkAllRead}
            onDeleteAlerts={handleDeleteAlerts}
            onNavigateTab={setActiveTab}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            onLogout={onLogout}
            personalDataOpen={settingsPersonalDataOpen}
            notificationsOpen={settingsNotificationsOpen}
            onToggleSection={(section) => {
              if (section === 'personalData') setSettingsPersonalDataOpen((v) => !v);
              else setSettingsNotificationsOpen((v) => !v);
            }}
            onNavigateTab={setActiveTab}
          />
        );
    }
  };

  const renderNavItems = (onNavigate: () => void) => (
    <>
      <View style={styles.drawerList}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === 'notifications' && unreadCount > 0;
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
              {showBadge && (
                <View style={styles.drawerBadge}>
                  <Text style={styles.drawerBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
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
              {unreadCount > 0 && (
                <View style={styles.menuButtonBadge}>
                  <Text style={styles.menuButtonBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
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
  menuButtonBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#0b0508',
  },
  menuButtonBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
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
  drawerBadge: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  drawerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
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
