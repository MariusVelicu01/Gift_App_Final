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
      <Text style={styles.title}>Persoane Dragi</Text>

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
            style={styles.card}
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
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  image: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  imagePlaceholder: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2563eb',
  },
  infoBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  meta: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
});