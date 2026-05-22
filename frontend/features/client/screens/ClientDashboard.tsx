import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './HomeScreen';
import LovedOnesScreen from './LovedOnesScreen';
import CalendarScreen from './CalendarScreen';
import PartnerStoresScreen from './PartnerStoresScreen';
import NotificationsScreen from './NotificationsScreen';
import SettingsScreen from './SettingsScreen';
import { useAuth } from '../../../context/AuthContext';
import { C } from '../../../constants/theme';
import { AppNotification, PriceAlert, PriceAlertTarget } from '../../../types/priceAlerts';
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
import { getLovedOnesCache } from '../../../services/lovedOnesCache';

type ClientTab = 'home' | 'lovedOnes' | 'calendar' | 'partnerStores' | 'notifications' | 'settings';

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
  onLogout: () => void;
};

export default function ClientDashboard({ firstName, onLogout }: Props) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<ClientTab>('home');
  const [alerts, setAlerts] = useState<AppNotification[]>([]);
  const [priceAlertTarget, setPriceAlertTarget] = useState<PriceAlertTarget | null>(null);
  const [settingsPersonalDataOpen, setSettingsPersonalDataOpen] = useState(false);
  const [settingsNotificationsOpen, setSettingsNotificationsOpen] = useState(false);

  const calendarResetRef  = useRef<(() => void) | null>(null);
  const lovedOnesResetRef = useRef<(() => void) | null>(null);

  const loadAlerts = useCallback(async () => {
    if (!token) return;
    try {
      const [priceAlerts, lovedOnes] = await Promise.all([
        getPriceAlerts(token),
        getLovedOnesCache(token),
      ]);
      const birthdayAlerts = await generateBirthdayAlerts(lovedOnes);
      setAlerts([...priceAlerts, ...birthdayAlerts]);
    } catch {}
  }, [token]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const unreadCount = alerts.filter((a) => !a.readAt).length;

  const handleOpenAlert = useCallback(async (alert: AppNotification) => {
    if (!alert.readAt) {
      if ((alert as any).notificationKind === 'birthday') {
        await markBirthdayAlertRead(alert.id);
      } else if (token) {
        await markPriceAlertRead(token, alert.id);
      }
      setAlerts((prev) =>
        prev.map((a) => a.id === alert.id ? { ...a, readAt: new Date().toISOString() } : a)
      );
    }
    if ((alert as PriceAlert).productId) {
      setPriceAlertTarget({ alert: alert as PriceAlert });
      setActiveTab('lovedOnes');
    }
  }, [token]);

  const handleMarkAllRead = useCallback(async () => {
    if (!token) return;
    await markAllPriceAlertsRead(token);
    setAlerts((prev) =>
      prev.map((a) => ({ ...a, readAt: a.readAt ?? new Date().toISOString() }))
    );
  }, [token]);

  const handleDeleteAlerts = useCallback(async (mode: 'read' | 'all') => {
    if (!token) return;
    const remaining = await deletePriceAlerts(token, mode);
    setAlerts(remaining);
  }, [token]);

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen firstName={firstName} />;
      case 'lovedOnes':
        return (
          <LovedOnesScreen
            priceAlertTarget={priceAlertTarget}
            onPriceAlertTargetConsumed={() => setPriceAlertTarget(null)}
            resetRef={lovedOnesResetRef}
          />
        );
      case 'calendar':
        return <CalendarScreen resetRef={calendarResetRef} />;
      case 'partnerStores':
        return <PartnerStoresScreen />;
      case 'notifications':
        return (
          <NotificationsScreen
            alerts={alerts}
            onOpenAlert={handleOpenAlert}
            onMarkAllRead={handleMarkAllRead}
            onDeleteAlerts={handleDeleteAlerts}
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
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>{renderScreen()}</View>

      <View style={styles.bottomNav}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === 'notifications' && unreadCount > 0;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={styles.tabCell}
            >
              {isActive ? (
                <View style={styles.pillActive}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={tab.iconActive} size={20} color="#fff" />
                    {showBadge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.labelActive}>{tab.label}</Text>
                </View>
              ) : (
                <View style={styles.pillInactive}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={tab.icon} size={22} color="#9ca3af" />
                    {showBadge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.labelInactive}>{tab.label}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content:   { flex: 1 },

  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 4,
    paddingBottom: 14,
    alignItems: 'center',
  },

  tabCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.accent,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 5,
  },

  pillInactive: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },

  iconWrap: {
    position: 'relative',
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -7,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
  },

  labelActive: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  labelInactive: {
    fontSize: 9,
    fontWeight: '500',
    color: '#9ca3af',
    marginTop: 1,
  },
});
