import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { C } from '../../../constants/theme';
import HomeScreen from './HomeScreen';
import LovedOnesScreen from './LovedOnesScreen';
import CalendarScreen from './CalendarScreen';
import PartnerStoresScreen from './PartnerStoresScreen';
import NotificationsScreen from './NotificationsScreen';
import SettingsScreen from './SettingsScreen';
import { pushAppBackEntry } from '../../../services/navigationHistory';
import {
  getCalendarCache,
  subscribeCalendarCache,
} from '../../../services/calendarCache';
import { useAuth } from '../../../context/AuthContext';
import {
  deletePriceAlerts,
  getPriceAlerts,
  markAllPriceAlertsRead,
  markPriceAlertRead,
} from '../../../services/priceAlertsApi';
import { getLovedOnes } from '../../../services/lovedOnesApi';
import {
  generateBirthdayAlerts,
  markBirthdayAlertRead,
} from '../../../services/birthdayAlertsService';
import {
  ClientSettings,
  DEFAULT_SETTINGS,
  loadClientSettings,
} from '../../../services/clientSettings';
import {
  AppNotification,
  BirthdayAlert,
  DeadlineAlert,
  PriceAlert,
  PriceAlertTarget,
} from '../../../types/priceAlerts';
import { GiftPlan } from '../../../types/giftPlans';

type DeadlineNotificationPrefs = {
  readIds: string[];
  deletedIds: string[];
};

type ClientTab =
  | 'home'
  | 'lovedOnes'
  | 'calendar'
  | 'partnerStores'
  | 'notifications'
  | 'settings';

type GiftDetailsTarget = {
  lovedOneId: string;
  giftPlanId: string;
};

type Props = {
  firstName: string;
  onLogout: () => void;
};

const TABS: { id: ClientTab; icon: string; label: string }[] = [
  { id: 'home', icon: '\uD83C\uDFE0', label: 'Acasa' },
  { id: 'lovedOnes', icon: '\uD83C\uDF81', label: 'Persoane' },
  { id: 'calendar', icon: '\uD83D\uDCC5', label: 'Calendar' },
  { id: 'partnerStores', icon: '\uD83D\uDED2', label: 'Magazine' },
  { id: 'notifications', icon: '\uD83D\uDD14', label: 'Notificari' },
  { id: 'settings', icon: '\u2699\uFE0F', label: 'Setari' },
];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function getTodayKey() {
  const today = new Date();

  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
    today.getDate()
  )}`;
}

function dateKeyToDate(dateKey?: string) {
  if (!dateKey) return null;

  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function daysUntil(dateKey?: string) {
  const date = dateKeyToDate(dateKey);
  const today = dateKeyToDate(getTodayKey());

  if (!date || !today) return null;

  return Math.floor((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function getDeadlineStorageKey(userId?: string) {
  return `gift_app_deadline_notifications_${userId || 'default'}`;
}

function makeDeadlineAlert(
  giftPlan: GiftPlan,
  lovedOneName: string,
  type: DeadlineAlert['type'],
  deadlineDate: string,
  daysLeft: number,
  readIds: Set<string>
): DeadlineAlert {
  const deadlineStatus = daysLeft < 0 ? 'overdue' : 'upcoming';
  const todayKey = getTodayKey();
  const id = `deadline-${type}-${deadlineStatus}-${giftPlan.lovedOneId}-${giftPlan.id}-${todayKey}`;

  return {
    notificationKind: 'deadline',
    id,
    type,
    deadlineStatus,
    lovedOneId: giftPlan.lovedOneId,
    lovedOneName,
    giftPlanId: giftPlan.id,
    giftPurpose: giftPlan.purpose,
    deadlineDate,
    daysLeft,
    createdAt: new Date().toISOString(),
    readAt: readIds.has(id) ? new Date().toISOString() : null,
  };
}

function isDeadlineAlert(alert: AppNotification): alert is DeadlineAlert {
  return alert.notificationKind === 'deadline';
}

function isBirthdayAlert(alert: AppNotification): alert is BirthdayAlert {
  return (alert as BirthdayAlert).notificationKind === 'birthday';
}

export default function ClientDashboard({ firstName, onLogout }: Props) {
  const { token, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<ClientTab>('home');
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [deadlineAlerts, setDeadlineAlerts] = useState<DeadlineAlert[]>([]);
  const [birthdayAlerts, setBirthdayAlerts] = useState<BirthdayAlert[]>([]);
  const [clientSettings, setClientSettings] = useState<ClientSettings>(DEFAULT_SETTINGS);
  const [deadlinePrefs, setDeadlinePrefs] = useState<DeadlineNotificationPrefs>({
    readIds: [],
    deletedIds: [],
  });
  const [priceAlertTarget, setPriceAlertTarget] =
    useState<PriceAlertTarget | null>(null);
  const [giftDetailsTarget, setGiftDetailsTarget] =
    useState<GiftDetailsTarget | null>(null);
  const [lovedOneTarget, setLovedOneTarget] =
    useState<{ lovedOneId: string } | null>(null);
  const [personalDataOpen, setPersonalDataOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const lovedOnesTabResetRef = useRef<(() => void) | null>(null);
  const calendarTabResetRef = useRef<(() => void) | null>(null);
  const partnerStoresTabResetRef = useRef<(() => void) | null>(null);

  const saveDeadlinePrefs = async (nextPrefs: DeadlineNotificationPrefs) => {
    setDeadlinePrefs(nextPrefs);

    try {
      await AsyncStorage.setItem(
        getDeadlineStorageKey(profile?.uid),
        JSON.stringify(nextPrefs)
      );
    } catch (error) {
      console.error('SAVE DEADLINE NOTIFICATION PREFS ERROR:', error);
    }
  };

  const loadDeadlinePrefs = async () => {
    try {
      const raw = await AsyncStorage.getItem(getDeadlineStorageKey(profile?.uid));
      const parsed = raw ? JSON.parse(raw) : null;

      setDeadlinePrefs({
        readIds: Array.isArray(parsed?.readIds) ? parsed.readIds : [],
        deletedIds: Array.isArray(parsed?.deletedIds) ? parsed.deletedIds : [],
      });
    } catch (error) {
      console.error('LOAD DEADLINE NOTIFICATION PREFS ERROR:', error);
      setDeadlinePrefs({ readIds: [], deletedIds: [] });
    }
  };

  const loadPriceAlerts = async () => {
    try {
      if (!token) return;
      const alerts = await getPriceAlerts(token);

      setPriceAlerts(alerts);
    } catch (error) {
      console.error('LOAD PRICE ALERTS ERROR:', error);
    }
  };

  const loadBirthdayAlerts = async () => {
    try {
      if (!token) return;
      const lovedOnes = await getLovedOnes(token);
      const alerts = await generateBirthdayAlerts(lovedOnes);
      setBirthdayAlerts(alerts);
    } catch (error) {
      console.error('LOAD BIRTHDAY ALERTS ERROR:', error);
    }
  };

  const refreshSettings = async () => {
    const settings = await loadClientSettings();
    setClientSettings(settings);
  };

  useEffect(() => {
    loadPriceAlerts();
    const interval = setInterval(loadPriceAlerts, 3000);

    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    refreshSettings();
    loadBirthdayAlerts();
  }, [token]);

  useEffect(() => {
    loadDeadlinePrefs();
  }, [profile?.uid]);

  const loadDeadlineAlerts = async () => {
    try {
      if (!token) return;

      const readIds = new Set(deadlinePrefs.readIds);
      const deletedIds = new Set(deadlinePrefs.deletedIds);
      const calendarData = await getCalendarCache(token);
      const alerts: DeadlineAlert[] = [];

      calendarData.lovedOnes.forEach((lovedOne) => {
        const giftPlans = calendarData.giftPlansByLovedOne[lovedOne.id] || [];

        giftPlans.forEach((giftPlan) => {
          const purchaseDeadlineDate =
            giftPlan.purchaseDeadlineDate || giftPlan.deadlineDate;
          const purchaseDaysLeft = daysUntil(purchaseDeadlineDate);

          if (giftPlan.status === 'planned' && purchaseDaysLeft !== null) {
            const shouldNotifyPurchase =
              (purchaseDaysLeft >= 0 && purchaseDaysLeft <= 14) ||
              purchaseDaysLeft === -1;

            if (shouldNotifyPurchase) {
              const alert = makeDeadlineAlert(
                giftPlan,
                lovedOne.name,
                'purchase_deadline',
                purchaseDeadlineDate,
                purchaseDaysLeft,
                readIds
              );

              if (!deletedIds.has(alert.id)) {
                alerts.push(alert);
              }
            }
          }

          const offerDaysLeft = daysUntil(giftPlan.deadlineDate);

          if (giftPlan.status !== 'completed' && offerDaysLeft !== null) {
            const shouldNotifyOffer =
              [7, 3, 2, 1, 0].includes(offerDaysLeft) ||
              offerDaysLeft === -1;

            if (shouldNotifyOffer) {
              const alert = makeDeadlineAlert(
                giftPlan,
                lovedOne.name,
                'offer_deadline',
                giftPlan.deadlineDate,
                offerDaysLeft,
                readIds
              );

              if (!deletedIds.has(alert.id)) {
                alerts.push(alert);
              }
            }
          }
        });
      });

      setDeadlineAlerts(alerts);
    } catch (error) {
      console.error('LOAD DEADLINE ALERTS ERROR:', error);
    }
  };

  useEffect(() => {
    loadDeadlineAlerts();
  }, [deadlinePrefs, token]);

  useEffect(() => {
    return subscribeCalendarCache(() => {
      loadDeadlineAlerts();
    });
  }, [deadlinePrefs, token]);

  useEffect(() => {
    if (activeTab === 'notifications') {
      loadPriceAlerts();
      loadBirthdayAlerts();
    }
    if (activeTab !== 'settings') {
      refreshSettings();
    }
  }, [activeTab]);

  const navigateToTab = (tab: ClientTab) => {
    if (tab === activeTab) {
      if (tab === 'lovedOnes') {
        lovedOnesTabResetRef.current?.();
      } else if (tab === 'calendar') {
        calendarTabResetRef.current?.();
      } else if (tab === 'partnerStores') {
        partnerStoresTabResetRef.current?.();
      }
      return;
    }

    const previousTab = activeTab;
    pushAppBackEntry(() => setActiveTab(previousTab));
    setActiveTab(tab);
  };

  const openGiftDetails = (target: GiftDetailsTarget) => {
    setGiftDetailsTarget(target);
    setPriceAlertTarget(null);

    if (activeTab !== 'lovedOnes') {
      const previousTab = activeTab;
      pushAppBackEntry(() => setActiveTab(previousTab));
    }

    setActiveTab('lovedOnes');
  };

  const openNotification = async (alert: AppNotification) => {
    if (isBirthdayAlert(alert)) {
      const readAt = alert.readAt || new Date().toISOString();
      setBirthdayAlerts((current) =>
        current.map((item) =>
          item.id === alert.id ? { ...item, readAt } : item
        )
      );
      await markBirthdayAlertRead(alert.id);
      setLovedOneTarget({ lovedOneId: alert.lovedOneId });
      setGiftDetailsTarget(null);
      setPriceAlertTarget(null);
      if (activeTab !== 'lovedOnes') {
        const previousTab = activeTab;
        pushAppBackEntry(() => setActiveTab(previousTab));
      }
      setActiveTab('lovedOnes');
      return;
    }

    if (isDeadlineAlert(alert)) {
      const readAt = alert.readAt || new Date().toISOString();
      const nextPrefs = {
        ...deadlinePrefs,
        readIds: Array.from(new Set([...deadlinePrefs.readIds, alert.id])),
      };

      setDeadlineAlerts((current) =>
        current.map((item) =>
          item.id === alert.id ? { ...item, readAt } : item
        )
      );
      saveDeadlinePrefs(nextPrefs);
      openGiftDetails({
        lovedOneId: alert.lovedOneId,
        giftPlanId: alert.giftPlanId,
      });
      return;
    }

    setPriceAlertTarget({ alert });
    setGiftDetailsTarget(null);
    setActiveTab('lovedOnes');
    const readAt = alert.readAt || new Date().toISOString();
    setPriceAlerts((current) =>
      current.map((item) =>
        item.id === alert.id ? { ...item, readAt } : item
      )
    );

    try {
      if (token) {
        await markPriceAlertRead(token, alert.id);
      }
    } catch (error) {
      console.error('MARK PRICE ALERT READ ERROR:', error);
    }
  };

  const markAllAlertsRead = async () => {
    const readAt = new Date().toISOString();
    const nextPrefs = {
      ...deadlinePrefs,
      readIds: Array.from(
        new Set([
          ...deadlinePrefs.readIds,
          ...deadlineAlerts.map((alert) => alert.id),
        ])
      ),
    };

    setDeadlineAlerts((current) =>
      current.map((alert) => ({ ...alert, readAt: alert.readAt || readAt }))
    );
    saveDeadlinePrefs(nextPrefs);

    setPriceAlerts((current) =>
      current.map((alert) => ({ ...alert, readAt: alert.readAt || readAt }))
    );

    const unreadBirthdays = birthdayAlerts.filter((a) => !a.readAt);
    if (unreadBirthdays.length > 0) {
      setBirthdayAlerts((current) =>
        current.map((alert) => ({ ...alert, readAt: alert.readAt || readAt }))
      );
      await Promise.all(unreadBirthdays.map((a) => markBirthdayAlertRead(a.id)));
    }

    try {
      if (token) {
        const updated = await markAllPriceAlertsRead(token);
        setPriceAlerts(updated);
      }
    } catch (error) {
      console.error('MARK ALL PRICE ALERTS READ ERROR:', error);
      loadPriceAlerts();
    }
  };

  const removeAlerts = async (mode: 'read' | 'all') => {
    const deadlineIdsToDelete =
      mode === 'all'
        ? deadlineAlerts.map((alert) => alert.id)
        : deadlineAlerts
            .filter((alert) => alert.readAt)
            .map((alert) => alert.id);
    const nextPrefs = {
      ...deadlinePrefs,
      deletedIds: Array.from(
        new Set([...deadlinePrefs.deletedIds, ...deadlineIdsToDelete])
      ),
    };

    setDeadlineAlerts((current) =>
      mode === 'all' ? [] : current.filter((alert) => !alert.readAt)
    );
    saveDeadlinePrefs(nextPrefs);

    setPriceAlerts((current) =>
      mode === 'all' ? [] : current.filter((alert) => !alert.readAt)
    );

    try {
      if (token) {
        const updated = await deletePriceAlerts(token, mode);
        setPriceAlerts(updated);
      }
    } catch (error) {
      console.error('DELETE PRICE ALERTS ERROR:', error);
      loadPriceAlerts();
    }
  };

  const filteredNotifications = useMemo<AppNotification[]>(() => {
    const notifEnabled = clientSettings.notificationsEnabled;

    const filteredPrice = priceAlerts.filter((a) => {
      if (!notifEnabled || !clientSettings.notifyBuyReminder) return false;
      if (a.changeDirection === 'up' && !clientSettings.notifyPriceUp) return false;
      if (a.changeDirection === 'down' && !clientSettings.notifyPriceDown) return false;
      return true;
    });

    const filteredDeadline = deadlineAlerts.filter((a) => {
      if (!notifEnabled) return false;
      if (a.type === 'purchase_deadline' && !clientSettings.notifyBuyReminder) return false;
      if (a.type === 'offer_deadline' && !clientSettings.notifyOfferReminder) return false;
      return true;
    });

    const filteredBirthday = (notifEnabled && clientSettings.notifyBirthdays)
      ? birthdayAlerts
      : [];

    return [
      ...filteredBirthday,
      ...filteredPrice,
      ...filteredDeadline,
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [birthdayAlerts, clientSettings, deadlineAlerts, priceAlerts]);

  const unreadNotificationsCount =
    (clientSettings.notificationsEnabled
      ? [
          ...(clientSettings.notifyPriceUp || clientSettings.notifyPriceDown
            ? priceAlerts.filter((a) => {
                if (a.changeDirection === 'up' && !clientSettings.notifyPriceUp) return false;
                if (a.changeDirection === 'down' && !clientSettings.notifyPriceDown) return false;
                return !a.readAt;
              })
            : []),
          ...(clientSettings.notifyBuyReminder || clientSettings.notifyOfferReminder
            ? deadlineAlerts.filter((a) => {
                if (a.type === 'purchase_deadline' && !clientSettings.notifyBuyReminder) return false;
                if (a.type === 'offer_deadline' && !clientSettings.notifyOfferReminder) return false;
                return !a.readAt;
              })
            : []),
          ...(clientSettings.notifyBirthdays
            ? birthdayAlerts.filter((a) => !a.readAt)
            : []),
        ]
      : []
    ).length;

  return (
    <SafeAreaView style={styles.root}>
      <View style={[styles.container, isWide && styles.containerWide]}>
        <View style={styles.content}>
          <View style={[styles.screenSlot, activeTab !== 'home' && styles.screenHidden]}>
            <HomeScreen firstName={firstName} onOpenGift={openGiftDetails} />
          </View>
          <View style={[styles.screenSlot, activeTab !== 'lovedOnes' && styles.screenHidden]}>
            <LovedOnesScreen
              priceAlertTarget={priceAlertTarget}
              onPriceAlertTargetConsumed={() => setPriceAlertTarget(null)}
              giftDetailsTarget={giftDetailsTarget}
              onGiftDetailsTargetConsumed={() => setGiftDetailsTarget(null)}
              lovedOneTarget={lovedOneTarget}
              onLovedOneTargetConsumed={() => setLovedOneTarget(null)}
              resetRef={lovedOnesTabResetRef}
            />
          </View>
          <View style={[styles.screenSlot, activeTab !== 'calendar' && styles.screenHidden]}>
            <CalendarScreen resetRef={calendarTabResetRef} />
          </View>
          <View style={[styles.screenSlot, activeTab !== 'partnerStores' && styles.screenHidden]}>
            <PartnerStoresScreen resetRef={partnerStoresTabResetRef} />
          </View>
          <View style={[styles.screenSlot, activeTab !== 'notifications' && styles.screenHidden]}>
            <NotificationsScreen
              alerts={filteredNotifications}
              onOpenAlert={openNotification}
              onMarkAllRead={markAllAlertsRead}
              onDeleteAlerts={removeAlerts}
            />
          </View>
          <View style={[styles.screenSlot, activeTab !== 'settings' && styles.screenHidden]}>
            <SettingsScreen
              onLogout={onLogout}
              personalDataOpen={personalDataOpen}
              notificationsOpen={notificationsOpen}
              onToggleSection={(section) => {
                if (section === 'personalData') {
                  setPersonalDataOpen((prev) => !prev);
                } else {
                  setNotificationsOpen((prev) => !prev);
                }
              }}
            />
          </View>
        </View>

        <View style={styles.bottomNavOuter}>
          <View style={styles.bottomNav}>
            {TABS.map((tab) => (
              <TabButton
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                isActive={activeTab === tab.id}
                badgeCount={
                  tab.id === 'notifications' ? unreadNotificationsCount : 0
                }
                onPress={() => navigateToTab(tab.id)}
              />
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function TabButton({
  icon,
  label,
  isActive,
  badgeCount = 0,
  onPress,
}: {
  icon: string;
  label: string;
  isActive: boolean;
  badgeCount?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.tabButton,
        hovered && !isActive && styles.tabButtonHover,
        pressed && styles.tabButtonPressed,
        isActive && styles.tabButtonActive,
      ]}
    >
      <View style={styles.tabIconWrap}>
        <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>{icon}</Text>
        {badgeCount > 0 && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>
              {badgeCount > 9 ? '9+' : badgeCount}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  container: {
    flex: 1,
    width: '100%',
    minHeight: 500,
    backgroundColor: C.bg,
  },
  containerWide: {},
  content: {
    flex: 1,
  },
  screenSlot: {
    flex: 1,
  },
  screenHidden: {
    display: 'none',
  },
  bottomNavOuter: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 10,
    paddingTop: 6,
    backgroundColor: C.bg,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 22,
    paddingVertical: 6,
    paddingHorizontal: 4,
    justifyContent: 'space-between',
    borderWidth: 0.5,
    borderColor: C.border,
    shadowColor: '#1F1B16',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 16,
    alignItems: 'center',
    gap: 3,
  },
  tabButtonHover: {
    backgroundColor: C.surface2,
  },
  tabButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  tabButtonActive: {
    backgroundColor: C.accent,
  },
  tabIconWrap: {
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  tabIconActive: {
    // emoji color can't be changed; tint handled by active bg
  },
  tabBadge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: C.accent,
    borderWidth: 2,
    borderColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    color: C.accentInk,
    fontSize: 9,
    fontWeight: '700',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: C.textDim,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: C.accentInk,
    fontWeight: '700',
  },
});
