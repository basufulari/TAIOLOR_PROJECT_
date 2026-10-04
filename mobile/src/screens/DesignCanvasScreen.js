import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import SketchCanvas, { CANVAS_SIZE } from '../components/SketchCanvas';
import { canvas as canvasApi } from '../services/api';
import { mediaUrl } from '../config/api';
import { useRequireBackend } from '../hooks/useRequireBackend';
import Button from '../components/Button';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { goToMainTab } from '../navigation/helpers';
import { colors } from '../theme/colors';

export default function DesignCanvasScreen({ navigation }) {
  const { isAdmin } = useAuth();
  const { guard } = useRequireBackend();
  const [paths, setPaths] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [previewUri, setPreviewUri] = useState(null);

  const clearCanvas = () => {
    setPaths([]);
    setAnalysis(null);
    setPreviewUri(null);
  };

  const undoStroke = () => {
    setPaths((p) => p.slice(0, -1));
    setAnalysis(null);
  };

  const analyze = async () => {
    if (!guard()) return;
    if (paths.length === 0) {
      Alert.alert('Empty canvas', 'Draw your clothing design with your finger first');
      return;
    }
    setLoading(true);
    try {
      const { data } = await canvasApi.analyze({
        paths,
        canvasWidth: CANVAS_SIZE.width,
        canvasHeight: CANVAS_SIZE.height,
      });
      setAnalysis(data);
      if (data.sketchPreviewBase64) {
        setPreviewUri(`data:image/png;base64,${data.sketchPreviewBase64}`);
      }
    } catch (e) {
      Alert.alert('Analysis failed', e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveDesign = async () => {
    if (!guard()) return;
    if (!title.trim()) {
      Alert.alert('Title required', 'Name your custom design');
      return;
    }
    if (paths.length === 0) {
      Alert.alert('Empty canvas', 'Draw a sketch before saving');
      return;
    }
    setLoading(true);
    try {
      let result = analysis;
      if (!result?.analysis) {
        const { data } = await canvasApi.analyze({
          paths,
          canvasWidth: CANVAS_SIZE.width,
          canvasHeight: CANVAS_SIZE.height,
        });
        result = data;
      }
      const { data } = await canvasApi.save({
        title: title.trim(),
        paths,
        canvasWidth: CANVAS_SIZE.width,
        canvasHeight: CANVAS_SIZE.height,
        analysis: result.analysis || result,
        isPublic: true,
      });
      Alert.alert('Saved', 'Your design is stored in MongoDB', [
        {
          text: isAdmin ? 'Back to admin' : 'View designs',
          onPress: () => goToMainTab(navigation, isAdmin ? 'Admin' : 'Designs'),
        },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      clearCanvas();
      setTitle('');
    } catch (e) {
      Alert.alert('Save failed', e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const a = analysis?.analysis || analysis;
  const similar = analysis?.similar_styles || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Design Canvas</Text>
      <Text style={styles.desc}>Sketch with touch — AI detects patterns & suggests styles</Text>

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolBtn} onPress={undoStroke}>
          <Text style={styles.toolText}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={clearCanvas}>
          <Text style={styles.toolText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <SketchCanvas paths={paths} setPaths={setPaths} />

      {previewUri && (
        <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="contain" />
      )}

      <TextInput
        style={styles.input}
        placeholder="Design name (e.g. Festive Kurta)"
        value={title}
        onChangeText={setTitle}
        placeholderTextColor={colors.textLight}
      />

      <Button title="Detect patterns & styles" onPress={analyze} loading={loading} variant="outline" />
      <View style={{ height: 8 }} />
      <Button title="Save to MongoDB" onPress={saveDesign} loading={loading} />

      {a && (
        <Card style={{ marginTop: 16 }}>
          <Text style={styles.cardTitle}>AI detection</Text>
          <Text style={styles.row}>
            Silhouette: <Text style={styles.val}>{a.silhouette || a.category}</Text>
          </Text>
          <Text style={styles.row}>
            Confidence: <Text style={styles.val}>{((a.confidence || 0) * 100).toFixed(0)}%</Text>
          </Text>
          {a.features && (
            <Text style={styles.row}>
              Features: {a.features.neckline}, {a.features.sleeves} sleeves, {a.features.fit} fit
            </Text>
          )}
          {a.patterns?.length > 0 && (
            <>
              <Text style={[styles.cardTitle, { marginTop: 12 }]}>Patterns</Text>
              {a.patterns.map((p, i) => (
                <Text key={i} style={styles.pattern}>
                  • {p.name} ({(p.confidence * 100).toFixed(0)}%) — {p.description}
                </Text>
              ))}
            </>
          )}
        </Card>
      )}

      {similar.length > 0 && (
        <Card>
          <Text style={styles.cardTitle}>Similar fashion styles</Text>
          {similar.map((s, i) => (
            <View key={i} style={styles.similarRow}>
              {s.imageUrl && (
                <Image
                  source={{ uri: mediaUrl(s.imageUrl) || s.imageUrl }}
                  style={styles.thumb}
                />
              )}
              <View style={styles.similarInfo}>
                <Text style={styles.similarName}>{s.name || s.title}</Text>
                <Text style={styles.similarMeta}>
                  {s.category || ''} • match {(s.match * 100).toFixed(0)}%
                  {s.fromDatabase ? ' • catalog' : ''}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800' },
  desc: { color: colors.textLight, marginVertical: 8 },
  toolbar: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginBottom: 8 },
  toolBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolText: { fontWeight: '600', color: colors.text, fontSize: 13 },
  preview: {
    width: '100%',
    height: 120,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: colors.card,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
  },
  cardTitle: { fontWeight: '700', marginBottom: 8, fontSize: 15 },
  row: { color: colors.textLight, marginVertical: 3, fontSize: 13 },
  val: { fontWeight: '700', color: colors.text },
  pattern: { fontSize: 12, color: colors.textLight, marginVertical: 2 },
  similarRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  thumb: { width: 48, height: 48, borderRadius: 8, marginRight: 10 },
  similarInfo: { flex: 1 },
  similarName: { fontWeight: '600', fontSize: 14 },
  similarMeta: { fontSize: 11, color: colors.textLight, marginTop: 2 },
});
