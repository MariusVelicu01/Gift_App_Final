import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Image,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { getLovedOnes } from '../../../services/lovedOnesApi';
import AddLovedOneModal from '../../../components/AddLovedOneModal';
import LovedOneDetailsScreen from './LovedOneDetailsScreen';
import { LovedOne } from '../../../types/lovedOnes';

export default function LovedOnesScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<LovedOne[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLovedOneId, setSelectedLovedOneId] = useState<string | null>(null);

  const loadLovedOnes = async () => {
    try {
      if (!token) return;
      const response = await getLovedOnes(token);
      setData(response);
    } catch (error) {
      console.error('LOAD LOVED ONES ERROR:', error);
    }
  };

  useEffect(() => {
    loadLovedOnes();
  }, [token]);

  if (selectedLovedOneId) {
    return (
      <LovedOneDetailsScreen
        lovedOneId={selectedLovedOneId}
        onBack={() => setSelectedLovedOneId(null)}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🎁 Persoane dragi</Text>

      <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>+ Adaugă persoană</Text>
      </Pressable>

      {data.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nu ai încă persoane salvate</Text>
          <Text style={styles.emptyText}>
            Adaugă prima persoană dragă pentru a începe.
          </Text>
        </View>
      ) : (
        data.map((item) => (
          <Pressable
            key={item.id}
            style={({ hovered, pressed }) => [
              styles.card,
              hovered && styles.cardHover,
              pressed && styles.cardPressed,
            ]}
            onPress={() => setSelectedLovedOneId(item.id)}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>
                  {item.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}

            <View style={styles.infoBlock}>
              <Text style={styles.name}>{item.name}</Text>

              <Text style={styles.meta}>
                Data: {String(item.day).padStart(2, '0')}.
                {String(item.month).padStart(2, '0')}
                {item.year ? `.${item.year}` : ''}
              </Text>

              {!!item.estimatedAgeRange && (
                <Text style={styles.meta}>
                  Vârstă estimată: {item.estimatedAgeRange}
                </Text>
              )}
            </View>
          </Pressable>
        ))
      )}

      <AddLovedOneModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={loadLovedOnes}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
    backgroundColor: '#fff7ed',
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#be123c',
    marginBottom: 2,
  },
  addButton: {
    backgroundColor: '#be123c',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fce7e0',
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fce7e0',
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    shadowColor: '#be123c',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHover: {
    backgroundColor: '#fff1f2',
    transform: [{ translateY: -2 }],
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  imagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffe4e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#be123c',
  },
  infoBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 5,
  },
  meta: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 3,
    fontWeight: '500',
  },
});
