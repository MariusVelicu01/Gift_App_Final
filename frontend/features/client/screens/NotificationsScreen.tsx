import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppNotification, BirthdayAlert, DeadlineAlert, PriceAlert } from '../../../types/priceAlerts';
import { getModalBackdropResponder } from '../../../utils/modalBackdrop';

type Props = {
  alerts: AppNotification[];
  onOpenAlert: (alert: AppNotification) => void;
  onRefresh: () => void;
  onMarkAllRead: () => void;
  onDeleteAlerts: (mode: 'read' | 'all') => void;
};

function formatMoney(value: number, currency = 'RON') {
  return `${value} ${currency}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return `${String(date.getDate()).padStart(2, '0')}.${String(
    date.getMonth() + 1
  ).padStart(2, '0')}.${date.getFullYear()}`;
}

function isDeadlineAlert(alert: AppNotification): alert is DeadlineAlert {
  return alert.notificationKind === 'deadline';
}

function isBirthdayAlert(alert: AppNotification): alert is BirthdayAlert {
  return (alert as BirthdayAlert).notificationKind === 'birthday';
}

function getDeadlineTitle(alert: DeadlineAlert) {
  if (alert.type === 'purchase_deadline') {
    return alert.deadlineStatus === 'overdue'
      ? 'Cumparare intarziata'
      : 'Reminder cumparare';
  }

  return alert.deadlineStatus === 'overdue'
    ? 'Oferire intarziata'
    : 'Reminder oferire';
}

function getDeadlineText(alert: DeadlineAlert) {
  const deadlineLabel =
    alert.type === 'purchase_deadline' ? 'cumparare' : 'oferire';

  if (alert.deadlineStatus === 'overdue') {
    return `Deadline-ul de ${deadlineLabel} a fost depasit cu o zi.`;
  }

  if (alert.daysLeft === 0) {
    return `Astazi este deadline-ul de ${deadlineLabel}.`;
  }

  return `Mai sunt ${alert.daysLeft} zile pana la deadline-ul de ${deadlineLabel}.`;
}

export default function NotificationsScreen({
  alerts,
  onOpenAlert,
  onRefresh,
  onMarkAllRead,
  onDeleteAlerts,
}: Props) {
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const unreadCount = alerts.filter((alert) => !alert.readAt).length;
  const readCount = alerts.length - unreadCount;

  const confirmDelete = (mode: 'read' | 'all') => {
    setDeleteConfirmVisible(false);
    onDeleteAlerts(mode);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>Notificari</Text>
            <Text style={styles.subtitle}>
              Alerte preturi, remindere cadouri si zile de nastere.
            </Text>
          </View>

          <Pressable
            style={({ hovered, pressed }) => [
              styles.refreshButton,
              hovered && styles.refreshButtonHover,
              pressed && styles.refreshButtonPressed,
            ]}
            onPress={onRefresh}
          >
            <Text style={styles.refreshButtonText}>Actualizeaza</Text>
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.unreadSummaryCard]}>
            <Text style={styles.summaryValue}>{unreadCount}</Text>
            <Text style={styles.summaryLabel}>noi</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValueMuted}>{readCount}</Text>
            <Text style={styles.summaryLabel}>citite</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={({ hovered, pressed }) => [
              styles.secondaryActionButton,
              hovered && styles.secondaryActionButtonHover,
              pressed && styles.refreshButtonPressed,
              unreadCount === 0 && styles.disabledButton,
            ]}
            onPress={onMarkAllRead}
            disabled={unreadCount === 0}
          >
            <Text style={styles.secondaryActionButtonText}>
              Marcheaza toate citite
            </Text>
          </Pressable>

          <Pressable
            style={({ hovered, pressed }) => [
              styles.deleteButton,
              hovered && styles.deleteButtonHover,
              pressed && styles.refreshButtonPressed,
              alerts.length === 0 && styles.disabledButton,
            ]}
            onPress={() => setDeleteConfirmVisible(true)}
            disabled={alerts.length === 0}
          >
            <Text style={styles.deleteButtonText}>Sterge notificari</Text>
          </Pressable>
        </View>

        {alerts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nu ai notificari</Text>
            <Text style={styles.emptyText}>
              Aici apar alertele despre preturi si reminder-ele pentru
              cumpararea sau oferirea cadourilor.
            </Text>
          </View>
        ) : (
          alerts.map((alert) => {
            const isUnread = !alert.readAt;

            if (isBirthdayAlert(alert)) {
              return (
                <Pressable
                  key={alert.id}
                  style={({ hovered, pressed }) => [
                    styles.alertCard,
                    isUnread && styles.birthdayCardUnread,
                    hovered && styles.alertCardHover,
                    pressed && styles.alertCardPressed,
                  ]}
                  onPress={() => onOpenAlert(alert)}
                >
                  <View style={[styles.alertIcon, styles.birthdayIcon, !isUnread && styles.alertIconRead]}>
                    <Text style={styles.alertIconText}>{'\uD83C\uDF82'}</Text>
                  </View>
                  <View style={styles.alertContent}>
                    <View style={styles.alertTitleRow}>
                      <Text style={[styles.alertTitle, styles.birthdayTitle, !isUnread && styles.alertTitleRead]}>
                        La multi ani!
                      </Text>
                      {isUnread && (
                        <Text style={[styles.unreadBadge, styles.birthdayBadge]}>Azi</Text>
                      )}
                    </View>
                    <Text style={styles.alertProduct}>{alert.lovedOneName}</Text>
                    <Text style={styles.alertText}>
                      Astazi este ziua de nastere a lui/a {alert.lovedOneName}!
                      {alert.year
                        ? ` Implineste ${new Date().getFullYear() - alert.year} ani.`
                        : ''}
                    </Text>
                    <Text style={[styles.alertAction, styles.birthdayAction]}>
                      {isUnread ? 'Deschide profilul' : 'Vezi persoana'}
                    </Text>
                  </View>
                </Pressable>
              );
            }

            if (isDeadlineAlert(alert)) {
              const isPurchase = alert.type === 'purchase_deadline';
              const isOverdue = alert.deadlineStatus === 'overdue';

              return (
                <Pressable
                  key={alert.id}
                  style={({ hovered, pressed }) => [
                    styles.alertCard,
                    isUnread && isPurchase && styles.purchaseDeadlineUnread,
                    isUnread && !isPurchase && styles.offerDeadlineUnread,
                    isUnread && isOverdue && styles.overdueDeadlineUnread,
                    hovered && styles.alertCardHover,
                    pressed && styles.alertCardPressed,
                  ]}
                  onPress={() => onOpenAlert(alert)}
                >
                  <View
                    style={[
                      styles.alertIcon,
                      !isUnread && styles.alertIconRead,
                      isPurchase && styles.purchaseDeadlineIcon,
                      !isPurchase && styles.offerDeadlineIcon,
                      isOverdue && styles.overdueDeadlineIcon,
                    ]}
                  >
                    <Text style={styles.alertIconText}>
                      {isPurchase ? 'C' : 'O'}
                    </Text>
                  </View>

                  <View style={styles.alertContent}>
                    <View style={styles.alertTitleRow}>
                      <Text
                        style={[
                          styles.alertTitle,
                          !isUnread && styles.alertTitleRead,
                          isPurchase && styles.purchaseDeadlineTitle,
                          !isPurchase && styles.offerDeadlineTitle,
                          isOverdue && styles.overdueDeadlineTitle,
                        ]}
                      >
                        {getDeadlineTitle(alert)}
                      </Text>
                      {isUnread && <Text style={styles.unreadBadge}>Nou</Text>}
                    </View>
                    <Text style={styles.alertProduct}>{alert.giftPurpose}</Text>
                    <Text style={styles.alertText}>{getDeadlineText(alert)}</Text>
                    <Text style={styles.alertMeta}>
                      Pentru: {alert.lovedOneName || 'persoana draga'} - Data:{' '}
                      {formatDate(alert.deadlineDate)}
                    </Text>
                    <Text
                      style={[
                        styles.alertAction,
                        isPurchase && styles.purchaseDeadlineAction,
                        !isPurchase && styles.offerDeadlineAction,
                        isOverdue && styles.overdueDeadlineAction,
                      ]}
                    >
                      {isUnread
                        ? 'Deschide si marcheaza ca citita'
                        : 'Deschide cadoul'}
                    </Text>
                  </View>
                </Pressable>
              );
            }

            const priceAlert = alert as PriceAlert;
            const isDown = priceAlert.changeDirection === 'down';
            const isUp = priceAlert.changeDirection === 'up';
            const directionLabel = isUp
              ? 'Pret crescut'
              : isDown
                ? 'Pret scazut'
                : 'Pret modificat';
            const iconSymbol = isUp ? '\u2191' : isDown ? '\u2193' : '%';

            return (
              <Pressable
                key={alert.id}
                style={({ hovered, pressed }) => [
                  styles.alertCard,
                  isUnread && isDown && styles.alertCardDownUnread,
                  isUnread && isUp && styles.alertCardUpUnread,
                  isUnread && !isDown && !isUp && styles.alertCardUnread,
                  hovered && styles.alertCardHover,
                  pressed && styles.alertCardPressed,
                ]}
                onPress={() => onOpenAlert(priceAlert)}
              >
                <View
                  style={[
                    styles.alertIcon,
                    !isUnread && styles.alertIconRead,
                    isUnread && isDown && styles.alertIconDown,
                    isUnread && isUp && styles.alertIconUp,
                  ]}
                >
                  <Text style={styles.alertIconText}>{iconSymbol}</Text>
                </View>

                <View style={styles.alertContent}>
                  <View style={styles.alertTitleRow}>
                    <Text
                      style={[
                        styles.alertTitle,
                        !isUnread && styles.alertTitleRead,
                        isUnread && isDown && styles.alertTitleDown,
                        isUnread && isUp && styles.alertTitleUp,
                      ]}
                    >
                      {directionLabel}
                    </Text>
                    {isUnread && (
                      <Text
                        style={[
                          styles.unreadBadge,
                          isDown && styles.unreadBadgeDown,
                          isUp && styles.unreadBadgeUp,
                        ]}
                      >
                        Nou
                      </Text>
                    )}
                  </View>
                  <Text style={styles.alertProduct}>{priceAlert.productName}</Text>
                  <Text style={styles.alertText}>
                    {directionLabel} la {priceAlert.storeName}: de la{' '}
                    {formatMoney(priceAlert.oldPrice, priceAlert.currency)} la{' '}
                    {formatMoney(priceAlert.newPrice, priceAlert.currency)}.
                  </Text>
                  <Text style={styles.alertMeta}>
                    Pentru: {priceAlert.lovedOneName || 'persoana draga'} - Scop:{' '}
                    {priceAlert.giftPurpose || '-'} - {formatDate(priceAlert.createdAt)}
                  </Text>
                  <Text
                    style={[
                      styles.alertAction,
                      isUnread && isDown && styles.alertActionDown,
                      isUnread && isUp && styles.alertActionUp,
                    ]}
                  >
                    {isUnread
                      ? 'Deschide si marcheaza ca citita'
                      : 'Deschide cadoul'}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={deleteConfirmVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View
          style={styles.modalOverlay}
          {...getModalBackdropResponder(() => setDeleteConfirmVisible(false))}
        >
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Sterge notificari?</Text>
            <Text style={styles.confirmText}>
              Alege daca stergi doar notificarile citite sau toate notificarile
              vizibile.
            </Text>

            <Pressable
              style={[
                styles.confirmPrimaryButton,
                readCount === 0 && styles.disabledButton,
              ]}
              onPress={() => confirmDelete('read')}
              disabled={readCount === 0}
            >
              <Text style={styles.confirmPrimaryButtonText}>
                Sterge doar cele citite
              </Text>
            </Pressable>

            <Pressable
              style={styles.confirmDangerButton}
              onPress={() => confirmDelete('all')}
            >
              <Text style={styles.confirmDangerButtonText}>Sterge toate</Text>
            </Pressable>

            <Pressable
              style={styles.confirmCancelButton}
              onPress={() => setDeleteConfirmVisible(false)}
            >
              <Text style={styles.confirmCancelButtonText}>Anuleaza</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
    backgroundColor: '#fff7ed',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextBlock: {
    flex: 1,
  },
  title: {
    color: '#be123c',
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  refreshButton: {
    backgroundColor: '#ffffff',
    borderColor: '#fed7aa',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  refreshButtonHover: {
    backgroundColor: '#fff1f2',
  },
  refreshButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  refreshButtonText: {
    color: '#be123c',
    fontSize: 12,
    fontWeight: '900',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: '#fce7e0',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  unreadSummaryCard: {
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
  },
  summaryValue: {
    color: '#f97316',
    fontSize: 34,
    fontWeight: '900',
  },
  summaryValueMuted: {
    color: '#6b7280',
    fontSize: 34,
    fontWeight: '900',
  },
  summaryLabel: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#fed7aa',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
  },
  secondaryActionButtonHover: {
    backgroundColor: '#fff1f2',
  },
  secondaryActionButtonText: {
    color: '#be123c',
    fontSize: 13,
    fontWeight: '900',
  },
  deleteButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingVertical: 12,
  },
  deleteButtonHover: {
    backgroundColor: '#fecaca',
  },
  deleteButtonText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.45,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderColor: '#fce7e0',
    borderRadius: 14,
    borderWidth: 1,
    padding: 22,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderColor: '#fce7e0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  alertCardUnread: {
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  alertCardDownUnread: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  alertCardUpUnread: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff1f2',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  purchaseDeadlineUnread: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  offerDeadlineUnread: {
    borderColor: '#5eead4',
    backgroundColor: '#f0fdfa',
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  overdueDeadlineUnread: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff1f2',
    shadowColor: '#dc2626',
  },
  birthdayCardUnread: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  birthdayIcon: {
    backgroundColor: '#f59e0b',
  },
  birthdayTitle: {
    color: '#b45309',
  },
  birthdayBadge: {
    backgroundColor: '#f59e0b',
  },
  birthdayAction: {
    color: '#b45309',
  },
  alertCardHover: {
    backgroundColor: '#fff1f2',
    transform: [{ translateY: -1 }],
  },
  alertCardPressed: {
    transform: [{ scale: 0.99 }],
  },
  alertIcon: {
    alignItems: 'center',
    backgroundColor: '#f97316',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  alertIconRead: {
    backgroundColor: '#9ca3af',
  },
  alertIconDown: {
    backgroundColor: '#16a34a',
  },
  alertIconUp: {
    backgroundColor: '#dc2626',
  },
  purchaseDeadlineIcon: {
    backgroundColor: '#2563eb',
  },
  offerDeadlineIcon: {
    backgroundColor: '#0d9488',
  },
  overdueDeadlineIcon: {
    backgroundColor: '#dc2626',
  },
  alertIconText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  alertContent: {
    flex: 1,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTitle: {
    color: '#be123c',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  alertTitleRead: {
    color: '#6b7280',
  },
  alertTitleDown: {
    color: '#15803d',
  },
  alertTitleUp: {
    color: '#b91c1c',
  },
  purchaseDeadlineTitle: {
    color: '#1d4ed8',
  },
  offerDeadlineTitle: {
    color: '#0f766e',
  },
  overdueDeadlineTitle: {
    color: '#b91c1c',
  },
  unreadBadge: {
    backgroundColor: '#f97316',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  unreadBadgeDown: {
    backgroundColor: '#16a34a',
  },
  unreadBadgeUp: {
    backgroundColor: '#dc2626',
  },
  alertProduct: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  alertText: {
    color: '#4b5563',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  alertMeta: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  alertAction: {
    color: '#be123c',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 8,
  },
  alertActionDown: {
    color: '#15803d',
  },
  alertActionUp: {
    color: '#b91c1c',
  },
  purchaseDeadlineAction: {
    color: '#1d4ed8',
  },
  offerDeadlineAction: {
    color: '#0f766e',
  },
  overdueDeadlineAction: {
    color: '#b91c1c',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    gap: 12,
  },
  confirmTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  confirmText: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 20,
  },
  confirmPrimaryButton: {
    backgroundColor: '#be123c',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmPrimaryButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  confirmDangerButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmDangerButtonText: {
    color: '#b91c1c',
    fontWeight: '900',
  },
  confirmCancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmCancelButtonText: {
    color: '#6b7280',
    fontWeight: '900',
  },
});
