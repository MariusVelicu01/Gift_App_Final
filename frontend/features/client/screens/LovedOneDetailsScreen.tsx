import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { getLovedOneById } from '../../../services/lovedOnesApi';
import AddLovedOneModal from '../../../components/AddLovedOneModal';
import { LovedOne } from '.../../../types/lovedOnes';

function getZodiac(day: number, month: number) {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Berbec';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taur';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemeni';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Rac';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leu';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Fecioară';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Balanță';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpion';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Săgetător';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Vărsător';
  return 'Pești';
}

type Props = {
  lovedOneId: string;
  onBack: () => void;
};

export default function LovedOneDetailsScreen({ lovedOneId, onBack }: Props) {
  const { token } = useAuth();
  const [data, setData] = useState<LovedOne | null>(null);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);

  const load = async () => {
    try {
      if (!token) return;
      setLoading(true);
      const result = await getLovedOneById(token, lovedOneId);
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [lovedOneId, token]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Se încarcă...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text>Persoana nu a fost găsită.</Text>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Înapoi</Text>
        </Pressable>
      </View>
    );
  }

  const zodiac = getZodiac(data.day, data.month);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Înapoi</Text>
      </Pressable>

      <View style={styles.card}>
        {data.imageUrl ? (
          <Image source={{ uri: data.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              {data.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}

        <Text style={styles.name}>{data.name}</Text>

        <Text style={styles.info}>
          Data: {String(data.day).padStart(2, '0')}.{String(data.month).padStart(2, '0')}
          {data.year ? `.${data.year}` : ''}
        </Text>

        {!!data.estimatedAgeRange && (
          <Text style={styles.info}>Vârstă estimată: {data.estimatedAgeRange}</Text>
        )}

        <Text style={styles.info}>
          Gen:{' '}
          {data.gender === 'male'
            ? 'Masculin'
            : data.gender === 'female'
            ? 'Feminin'
            : '-'}
        </Text>

        <Text style={styles.info}>Zodie: {zodiac}</Text>

        {!!data.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Detalii</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        <Pressable style={styles.editButton} onPress={() => setEditVisible(true)}>
          <Text style={styles.editButtonText}>Editează</Text>
        </Pressable>
      </View>

      <AddLovedOneModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSaved={load}
        initialData={data}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    color: '#6b7280',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#111827',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 18,
    alignItems: 'flex-start',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 14,
  },
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  placeholderText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#2563eb',
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  info: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 6,
  },
  notesBox: {
    marginTop: 14,
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  editButton: {
    marginTop: 18,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
});