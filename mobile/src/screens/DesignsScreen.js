import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { designs } from '../services/api';
import { mediaUrl } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useRequireBackend } from '../hooks/useRequireBackend';
import { colors } from '../theme/colors';

function imageUri(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return mediaUrl(url);
}

export default function DesignsScreen({ navigation }) {
  const { isTailor } = useAuth();
  const { guard } = useRequireBackend();
  const [list, setList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { data } = await designs.list();
      setList(data.designs || []);
    } catch {
      setList([]);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const pickImageAndUpload = async () => {
    if (!guard()) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Allow gallery access to upload a design image');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!picked.canceled && picked.assets[0]) {
      navigation.navigate('AddDesign', { image: picked.assets[0] });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Designs</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.canvasBtn} onPress={() => navigation.navigate('DesignCanvas')}>
            <Text style={styles.canvasText}>✏️ Canvas</Text>
          </TouchableOpacity>
          {isTailor && (
            <TouchableOpacity style={styles.addBtn} onPress={pickImageAndUpload}>
              <Text style={styles.addText}>Pick image</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <FlatList
        data={list}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No designs yet — upload or use Design Canvas
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              if (!guard()) return;
              navigation.navigate('PlaceOrder', { designId: item._id, design: item });
            }}
          >
            <Image source={{ uri: imageUri(item.imageUrl) }} style={styles.image} resizeMode="cover" />
            <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cat}>
              {item.category}
              {item.source === 'canvas' ? ' • ✏️ sketch' : ''}
            </Text>
            {item.price > 0 && <Text style={styles.price}>₹{item.price}</Text>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '800' },
  headerBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  canvasBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  canvasText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  addBtn: { backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addText: { color: '#fff', fontWeight: '700' },
  list: { paddingHorizontal: 12 },
  row: { justifyContent: 'space-between', paddingHorizontal: 8 },
  card: { width: '48%', backgroundColor: colors.card, borderRadius: 14, marginBottom: 12, overflow: 'hidden' },
  image: { width: '100%', height: 140, backgroundColor: colors.border },
  name: { fontWeight: '700', padding: 10, paddingBottom: 2 },
  cat: { paddingHorizontal: 10, fontSize: 12, color: colors.textLight, textTransform: 'capitalize' },
  price: { padding: 10, paddingTop: 4, color: colors.accent, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, color: colors.textLight, padding: 20 },
});
