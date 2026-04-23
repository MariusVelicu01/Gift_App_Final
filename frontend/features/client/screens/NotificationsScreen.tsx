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
import { C, R, S } from '../../../constants/theme';

type Props = {
  alerts: AppNotification[];
  onOpenAlert: (alert: AppNotification) => void;
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
          <Text style={styles.title}>Notificari</Text>
          <Text style={styles.subtitle}>
            Alerte preturi, remindere cadouri si zile de nastere.
          </Text>
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
              pressed && styles.actionButtonPressed,
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
              pressed && styles.actionButtonPressed,
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
    backgroundColor: C.bg,
  },
  headerRow: {
    gap: 4,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '400',
    color: C.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: C.textDim,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderColor: C.border,
    borderRadius: R.xl,
    borderWidth: 0.5,
    padding: 16,
    ...S.card,
  },
  unreadSummaryCard: {
    borderColor: C.borderStrong,
    backgroundColor: C.warnBg,
  },
  summaryValue: {
    fontFamily: 'serif',
    color: C.warn,
    fontSize: 34,
    fontWeight: '400',
  },
  summaryValueMuted: {
    fontFamily: 'serif',
    color: C.textDim,
    fontSize: 34,
    fontWeight: '400',
  },
  summaryLabel: {
    color: C.textDim,
    fontSize: 14,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: C.surface,
    borderColor: C.border,
    borderRadius: R.md,
    borderWidth: 0.5,
    paddingVertical: 12,
  },
  secondaryActionButtonHover: {
    backgroundColor: C.accentSoft,
  },
  secondaryActionButtonText: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: C.dangerBg,
    borderRadius: R.md,
    paddingVertical: 12,
  },
  deleteButtonHover: {
    backgroundColor: '#f9d5d1',
  },
  deleteButtonText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  disabledButton: {
    opacity: 0.45,
  },
  emptyCard: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderStyle: 'dashed',
    padding: 22,
    ...S.card,
  },
  emptyTitle: {
    fontFamily: 'serif',
    color: C.text,
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 6,
  },
  emptyText: {
    color: C.textDim,
    fontSize: 14,
    lineHeight: 21,
  },
  alertCard: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderRadius: R.xl,
    borderWidth: 0.5,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    ...S.card,
  },
  alertCardUnread: {
    borderColor: C.borderStrong,
    backgroundColor: C.warnBg,
    shadowColor: C.warn,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  alertCardDownUnread: {
    borderColor: C.borderStrong,
    backgroundColor: C.sageBg,
    shadowColor: C.sage,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  alertCardUpUnread: {
    borderColor: C.borderStrong,
    backgroundColor: C.dangerBg,
    shadowColor: C.danger,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  purchaseDeadlineUnread: {
    borderColor: C.borderStrong,
    backgroundColor: C.accentSoft,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  offerDeadlineUnread: {
    borderColor: C.borderStrong,
    backgroundColor: C.sageBg,
    shadowColor: C.sage,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  overdueDeadlineUnread: {
    borderColor: C.borderStrong,
    backgroundColor: C.dangerBg,
    shadowColor: C.danger,
  },
  birthdayCardUnread: {
    borderColor: C.borderStrong,
    backgroundColor: C.warnBg,
    shadowColor: C.warn,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  birthdayIcon: {
    backgroundColor: C.warn,
  },
  birthdayTitle: {
    color: C.warn,
  },
  birthdayBadge: {
    backgroundColor: C.warn,
  },
  birthdayAction: {
    color: C.warn,
  },
  alertCardHover: {
    backgroundColor: C.surface2,
    transform: [{ translateY: -1 }],
  },
  alertCardPressed: {
    transform: [{ scale: 0.99 }],
  },
  alertIcon: {
    alignItems: 'center',
    backgroundColor: C.accent,
    borderRadius: R.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  alertIconRead: {
    backgroundColor: C.textFaint,
  },
  alertIconDown: {
    backgroundColor: C.sage,
  },
  alertIconUp: {
    backgroundColor: C.danger,
  },
  purchaseDeadlineIcon: {
    backgroundColor: C.accent,
  },
  offerDeadlineIcon: {
    backgroundColor: C.sage,
  },
  overdueDeadlineIcon: {
    backgroundColor: C.danger,
  },
  alertIconText: {
    color: C.accentInk,
    fontSize: 16,
    fontWeight: '700',
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
    color: C.accent,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  alertTitleRead: {
    color: C.textFaint,
  },
  alertTitleDown: {
    color: C.sage,
  },
  alertTitleUp: {
    color: C.danger,
  },
  purchaseDeadlineTitle: {
    color: C.accent,
  },
  offerDeadlineTitle: {
    color: C.sage,
  },
  overdueDeadlineTitle: {
    color: C.danger,
  },
  unreadBadge: {
    backgroundColor: C.accent,
    borderRadius: R.pill,
    color: C.accentInk,
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  unreadBadgeDown: {
    backgroundColor: C.sage,
  },
  unreadBadgeUp: {
    backgroundColor: C.danger,
  },
  alertProduct: {
    fontFamily: 'serif',
    color: C.text,
    fontSize: 16,
    fontWeight: '400',
    marginTop: 4,
  },
  alertText: {
    color: C.textDim,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  alertMeta: {
    color: C.textFaint,
    fontSize: 12,
    marginTop: 8,
  },
  alertAction: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  alertActionDown: {
    color: C.sage,
  },
  alertActionUp: {
    color: C.danger,
  },
  purchaseDeadlineAction: {
    color: C.accent,
  },
  offerDeadlineAction: {
    color: C.sage,
  },
  overdueDeadlineAction: {
    color: C.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31,27,22,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: 18,
    gap: 12,
    ...S.float,
  },
  confirmTitle: {
    fontFamily: 'serif',
    color: C.text,
    fontSize: 22,
    fontWeight: '400',
  },
  confirmText: {
    color: C.textDim,
    fontSize: 14,
    lineHeight: 20,
  },
  confirmPrimaryButton: {
    backgroundColor: C.accent,
    borderRadius: R.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmPrimaryButtonText: {
    color: C.accentInk,
    fontWeight: '600',
  },
  confirmDangerButton: {
    backgroundColor: C.dangerBg,
    borderRadius: R.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmDangerButtonText: {
    color: C.danger,
    fontWeight: '600',
  },
  confirmCancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmCancelButtonText: {
    color: C.textDim,
  },
});
