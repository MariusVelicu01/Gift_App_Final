import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { getAdminUsers, setUserBlocked, deleteUserAccount } from '../../../services/adminUsersApi';
import { UserProfile } from '../../../types/user';
import { getModalBackdropResponder } from '../../../utils/modalBackdrop';
import { C, R, S } from '../../../constants/theme';
import AdminFooter from '../components/AdminFooter';

function formatRo(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusOf(user: UserProfile): 'active' | 'blocked' | 'deleted' {
  if (user.deletedAt) return 'deleted';
  if (user.blocked) return 'blocked';
  return 'active';
}

export default function UsersScreen() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [blockTarget, setBlockTarget] = useState<UserProfile | null>(null);
  const [blockSaving, setBlockSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [actionUidPending, setActionUidPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError('');
      const data = await getAdminUsers(token);
      setUsers(data);
    } catch {
      setError('Nu am putut încărca utilizatorii.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((u) => (u.email || '').toLowerCase().includes(needle));
  }, [users, search]);

  const handleUnblock = async (user: UserProfile) => {
    if (!token) return;
    setActionUidPending(user.uid);
    setError('');
    try {
      await setUserBlocked(token, user.uid, false);
      await load();
    } catch {
      setError('Nu am putut debloca acest cont.');
    } finally {
      setActionUidPending(null);
    }
  };

  const confirmBlock = async () => {
    if (!token || !blockTarget) return;
    setBlockSaving(true);
    setError('');
    try {
      await setUserBlocked(token, blockTarget.uid, true);
      setBlockTarget(null);
      await load();
    } catch {
      setError('Nu am putut bloca acest cont.');
    } finally {
      setBlockSaving(false);
    }
  };

  const openDeleteModal = (user: UserProfile) => {
    setDeleteTarget(user);
    setDeleteConfirmText('');
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (!token || !deleteTarget) return;
    setDeleteSaving(true);
    setDeleteError('');
    try {
      await deleteUserAccount(token, deleteTarget.uid);
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      setDeleteError(e?.message || 'Nu am putut șterge acest cont.');
    } finally {
      setDeleteSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBlock}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Se încarcă...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Utilizatori</Text>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <TextInput
        style={styles.searchInput}
        placeholder="Caută după email..."
        placeholderTextColor={C.textFaint}
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.countText}>
        {filteredUsers.length} {filteredUsers.length === 1 ? 'cont' : 'conturi'}
      </Text>

      {filteredUsers.map((user) => {
        const status = statusOf(user);
        const isPending = actionUidPending === user.uid;
        return (
          <View key={user.uid} style={styles.card}>
            <View style={styles.userRow}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user.firstName} {user.lastName}
                </Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userMeta}>Creat: {formatRo(user.createdAt)}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  status === 'active' && styles.statusBadgeActive,
                  status === 'blocked' && styles.statusBadgeBlocked,
                  status === 'deleted' && styles.statusBadgeDeleted,
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {status === 'active' ? 'Activ' : status === 'blocked' ? 'Blocat' : 'Șters'}
                </Text>
              </View>
            </View>

            {status !== 'deleted' && (
              <View style={styles.actionsRow}>
                {status === 'blocked' ? (
                  <Pressable
                    style={[styles.actionButton, isPending && styles.disabledButton]}
                    onPress={() => handleUnblock(user)}
                    disabled={isPending}
                  >
                    <Text style={styles.actionButtonText}>
                      {isPending ? 'Se deblochează...' : 'Deblochează'}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.actionButton, isPending && styles.disabledButton]}
                    onPress={() => setBlockTarget(user)}
                    disabled={isPending}
                  >
                    <Text style={styles.actionButtonText}>Blochează</Text>
                  </Pressable>
                )}

                <Pressable
                  style={[styles.dangerActionButton, isPending && styles.disabledButton]}
                  onPress={() => openDeleteModal(user)}
                  disabled={isPending}
                >
                  <Text style={styles.dangerActionButtonText}>Șterge definitiv</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}

      {filteredUsers.length === 0 && (
        <View style={styles.card}>
          <Text style={styles.userMeta}>Niciun cont găsit.</Text>
        </View>
      )}

      <Modal
        visible={!!blockTarget}
        animationType="fade"
        transparent
        onRequestClose={() => setBlockTarget(null)}
      >
        <View style={styles.modalOverlay} {...getModalBackdropResponder(() => setBlockTarget(null))}>
          <View style={styles.confirmModalCard}>
            <Text style={styles.modalTitle}>Blochezi acest cont?</Text>
            <Text style={styles.confirmText}>
              {blockTarget?.email} nu va mai putea folosi aplicația până când îl deblochezi.
              Va fi deconectat automat, fără să fie nevoie de refresh.
            </Text>

            <Pressable
              style={[styles.dangerButton, blockSaving && styles.disabledButton]}
              onPress={confirmBlock}
              disabled={blockSaving}
            >
              <Text style={styles.dangerButtonText}>
                {blockSaving ? 'Se blochează...' : 'Blochează'}
              </Text>
            </Pressable>

            <Pressable style={styles.cancelButton} onPress={() => setBlockTarget(null)}>
              <Text style={styles.cancelButtonText}>Anulează</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!deleteTarget}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View
          style={styles.modalOverlay}
          {...getModalBackdropResponder(() => setDeleteTarget(null))}
        >
          <View style={styles.confirmModalCard}>
            <Text style={styles.modalTitle}>Ștergi definitiv acest cont?</Text>
            <Text style={styles.confirmText}>
              {deleteTarget?.email} nu va mai putea fi autentificat și nu se va mai putea
              crea niciun cont nou cu acest email. Statisticile existente rămân neafectate.
              Această acțiune este ireversibilă.
            </Text>

            <Text style={styles.modalLabel}>Scrie CONFIRM pentru a activa ștergerea</Text>
            <TextInput
              placeholder="CONFIRM"
              style={styles.modalInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
              editable={!deleteSaving}
            />

            {!!deleteError && <Text style={styles.errorText}>{deleteError}</Text>}

            <Pressable
              style={[
                styles.dangerButton,
                (deleteSaving || deleteConfirmText.trim() !== 'CONFIRM') && styles.disabledButton,
              ]}
              onPress={confirmDelete}
              disabled={deleteSaving || deleteConfirmText.trim() !== 'CONFIRM'}
            >
              <Text style={styles.dangerButtonText}>
                {deleteSaving ? 'Se șterge...' : 'Șterge definitiv'}
              </Text>
            </Pressable>

            <Pressable style={styles.cancelButton} onPress={() => setDeleteTarget(null)}>
              <Text style={styles.cancelButtonText}>Anulează</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <AdminFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: C.textDim,
  },
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
    backgroundColor: C.bg,
  },
  pageTitle: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '400',
    color: C.text,
    letterSpacing: -0.5,
  },
  searchInput: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: C.surface,
    color: C.text,
    fontSize: 14,
  },
  countText: {
    fontSize: 12,
    color: C.textFaint,
  },
  card: {
    backgroundColor: C.surface,
    padding: 16,
    borderRadius: R.xl,
    borderWidth: 0.5,
    borderColor: C.border,
    gap: 12,
    ...S.card,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  userEmail: {
    fontSize: 13,
    color: C.textDim,
  },
  userMeta: {
    fontSize: 12,
    color: C.textFaint,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeActive: {
    backgroundColor: C.sageBg,
  },
  statusBadgeBlocked: {
    backgroundColor: C.warnBg,
  },
  statusBadgeDeleted: {
    backgroundColor: C.dangerBg,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.text,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: C.surface2,
    borderRadius: R.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.border,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  dangerActionButton: {
    flex: 1,
    backgroundColor: C.dangerBg,
    borderRadius: R.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.borderStrong,
  },
  dangerActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.danger,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalCard: {
    backgroundColor: C.surface,
    borderRadius: R.xl,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    gap: 12,
    ...S.float,
  },
  modalTitle: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '400',
    color: C.text,
  },
  confirmText: {
    fontSize: 14,
    color: C.textDim,
    lineHeight: 20,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textFaint,
  },
  modalInput: {
    borderWidth: 0.5,
    borderColor: C.border,
    borderRadius: R.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.surface2,
    color: C.text,
    fontSize: 14,
  },
  dangerButton: {
    backgroundColor: C.danger,
    borderRadius: R.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textFaint,
  },
});
