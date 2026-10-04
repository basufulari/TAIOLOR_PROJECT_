import React, { useState } from 'react';
import { ScrollView, Alert, StyleSheet, View, Image, Text } from 'react-native';
import { designs } from '../services/api';
import Input from '../components/Input';
import Button from '../components/Button';
import { colors } from '../theme/colors';

export default function AddDesignScreen({ navigation, route }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('shirt');
  const [fabricType, setFabricType] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState(route.params?.image || null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!title.trim() || !image) {
      Alert.alert('Error', 'Title and image required. Go back and pick an image from Designs.');
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('category', category);
      form.append('fabricType', fabricType);
      form.append('price', price || '0');
      form.append('image', { uri: image.uri, type: 'image/jpeg', name: 'design.jpg' });
      await designs.create(form);
      Alert.alert('Done', 'Design uploaded', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {image ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="cover" />
          <Text style={styles.previewHint}>Selected from gallery</Text>
        </View>
      ) : (
        <Text style={styles.noImage}>No image — use Pick image on the Designs tab</Text>
      )}
      <Input label="Title" value={title} onChangeText={setTitle} />
      <Input label="Category (shirt, kurta, suit...)" value={category} onChangeText={setCategory} />
      <Input label="Fabric" value={fabricType} onChangeText={setFabricType} />
      <Input label="Price (₹)" value={price} onChangeText={setPrice} keyboardType="numeric" />
      <Button title="Upload design" onPress={submit} loading={loading} style={{ marginTop: 16 }} />
      <Button title="Cancel" onPress={() => navigation.goBack()} variant="outline" style={{ marginTop: 10 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  previewWrap: { marginBottom: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.card },
  preview: { width: '100%', height: 200 },
  previewHint: { padding: 8, fontSize: 12, color: colors.textLight, textAlign: 'center' },
  noImage: { color: colors.warning, marginBottom: 16, textAlign: 'center' },
});
