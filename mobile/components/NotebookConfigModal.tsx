import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AuthedImage } from '@/components/AuthedImage';
import { BookCover } from '@/components/BookCover';
import { Button } from '@/components/ui/Button';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '@/lib/api';
import {
  NOTEBOOK_PRESET_COVERS,
  type NotebookCoverId,
  getPresetCover,
  isPresetCover,
  resolveCoverForSave,
} from '@/lib/notebookCovers';
import { mergeUnsplashPhotos } from '@/lib/verseImageFormats';
import { resolveMediaUrl } from '@/lib/media';
import type { UnsplashImage } from '@/lib/types';

const DEFAULT_UNSPLASH_QUERY = 'nature landscape books';
const SEARCH_HINTS = ['libros', 'naturaleza', 'cielo', 'mar', 'montaña', 'flores', 'cruz', 'bosque', 'atardecer', 'vintage'];

interface NotebookConfigModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  initialName?: string;
  initialCover?: string | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (name: string, coverImage: string) => void;
}

function previewUri(coverUrl: string) {
  if (coverUrl.includes('images.unsplash.com')) {
    return api.getImageProxyUrl(coverUrl);
  }
  return resolveMediaUrl(coverUrl) ?? coverUrl;
}

export function NotebookConfigModal({
  visible,
  mode,
  initialName = '',
  initialCover = 'grad-purple',
  saving,
  onClose,
  onSave,
}: NotebookConfigModalProps) {
  const { colors, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const contentPadding = useContentPadding(8);
  const [name, setName] = useState(initialName);
  const [presetId, setPresetId] = useState<NotebookCoverId>('grad-purple');
  const [customUrl, setCustomUrl] = useState('');
  const [selectedUnsplashId, setSelectedUnsplashId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UnsplashImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState<string | undefined>();
  const [photosPage, setPhotosPage] = useState(1);
  const [hasMorePhotos, setHasMorePhotos] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loadingMorePhotos, setLoadingMorePhotos] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadPhotos = useCallback(async (query?: string, page = 1, append = false) => {
    if (page === 1) setLoadingPhotos(true);
    else setLoadingMorePhotos(true);
    try {
      const effectiveQuery = query?.trim() || DEFAULT_UNSPLASH_QUERY;
      const res = await api.fetchUnsplashImages(effectiveQuery, { page, orientation: 'portrait' });
      setPhotos((prev) => (append ? mergeUnsplashPhotos(prev, res.images) : res.images));
      setPhotosPage(page);
      setHasMorePhotos(res.hasMore);
    } catch {
      if (!append) {
        Alert.alert('Unsplash', 'No se pudieron cargar fotos. Puedes pegar una URL manualmente.');
      }
    } finally {
      setLoadingPhotos(false);
      setLoadingMorePhotos(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setName(initialName);
    if (initialCover && !isPresetCover(initialCover)) {
      setCustomUrl(initialCover);
      setPresetId('grad-purple');
      setSelectedUnsplashId(null);
    } else {
      setPresetId((initialCover as NotebookCoverId) || 'grad-purple');
      setCustomUrl('');
      setSelectedUnsplashId(null);
    }
    setSearchQuery('');
    setActiveSearch(undefined);
    setPhotos([]);
    setPhotosPage(1);
    setHasMorePhotos(false);
    loadPhotos(undefined, 1, false);
  }, [visible, initialName, initialCover, loadPhotos]);

  const runSearch = () => {
    const q = searchQuery.trim() || undefined;
    setActiveSearch(q);
    loadPhotos(q, 1, false);
  };

  const selectPreset = (id: NotebookCoverId) => {
    setPresetId(id);
    setCustomUrl('');
    setSelectedUnsplashId(null);
  };

  const selectUnsplash = (img: UnsplashImage) => {
    setCustomUrl(img.url);
    setSelectedUnsplashId(img.id);
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para subir una portada.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const { url } = await api.uploadImage(
        asset.uri,
        asset.fileName ?? `cover-${Date.now()}.jpg`,
        asset.mimeType ?? 'image/jpeg',
      );
      setCustomUrl(url);
      setSelectedUnsplashId(null);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, resolveCoverForSave(presetId, customUrl));
  };

  const hasCustom = !!customUrl.trim();
  const previewTitle = name.trim() || 'Mi libreta';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { paddingBottom: Math.max(16, insets.bottom) }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.card, borderRadius: radius.xl }]}
          onPress={() => {}}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: contentPadding }]}>
            <Text style={[styles.heading, { color: colors.text }]}>
              {mode === 'create' ? '✨ Nueva libreta de estudio' : 'Editar libreta'}
            </Text>

            <View style={styles.previewCenter}>
              <BookCover title={previewTitle} coverImage={hasCustom ? customUrl : presetId} width={112} height={154} />
            </View>

            <Text style={[styles.label, { color: colors.textMuted }]}>NOMBRE DEL CUADERNO</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, borderRadius: radius.lg }]}
              placeholder="Ej. Apuntes de Proverbios, Teología…"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.label, { color: colors.textMuted, marginTop: 10 }]}>PORTADA PREDISEÑADA</Text>
            <View style={styles.presetGrid}>
              {NOTEBOOK_PRESET_COVERS.map((cover) => {
                const active = !hasCustom && presetId === cover.id;
                return (
                  <Pressable
                    key={cover.id}
                    onPress={() => selectPreset(cover.id)}
                    style={[styles.presetBtn, active && { borderColor: colors.primary, borderWidth: 2 }]}
                  >
                    <LinearGradient colors={cover.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    <Text style={styles.presetLabel} numberOfLines={2}>{cover.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.label, { color: colors.textMuted, marginBottom: 0 }]}>UNSPLASH</Text>
              <Pressable
                onPress={() => {
                  if (hasMorePhotos && !loadingMorePhotos) loadPhotos(activeSearch, photosPage + 1, true);
                }}
                disabled={!hasMorePhotos || loadingMorePhotos || loadingPhotos}
              >
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                  {loadingMorePhotos ? 'Cargando…' : hasMorePhotos ? '↻ Más fotos' : 'Sin más fotos'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.searchRow}>
              <TextInput
                style={[styles.searchInput, { color: colors.text, borderColor: colors.border, borderRadius: radius.lg }]}
                placeholder="Buscar portada (libros, mar, montaña…)"
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={runSearch}
                returnKeyType="search"
              />
              <Pressable
                style={[styles.searchBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
                onPress={runSearch}
                disabled={loadingPhotos}
              >
                <Text style={styles.searchBtnText}>Buscar</Text>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hintRow}>
              {SEARCH_HINTS.map((hint) => (
                <Pressable
                  key={hint}
                  style={[
                    styles.hintChip,
                    {
                      borderColor: activeSearch === hint ? colors.primary : colors.border,
                      backgroundColor: activeSearch === hint ? colors.primarySoft : colors.background,
                      borderRadius: radius.full,
                    },
                  ]}
                  onPress={() => {
                    setSearchQuery(hint);
                    setActiveSearch(hint);
                    loadPhotos(hint, 1, false);
                  }}
                >
                  <Text style={{ color: activeSearch === hint ? colors.primary : colors.textMuted, fontSize: 11 }}>
                    {hint}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {loadingPhotos && photos.length === 0 ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
            ) : (
              <View style={styles.photoGrid}>
                {photos.map((img) => {
                  const active = selectedUnsplashId === img.id || customUrl === img.url;
                  return (
                    <Pressable key={img.id} onPress={() => selectUnsplash(img)} style={styles.photoCell}>
                      <Image
                        source={{ uri: img.thumb }}
                        style={[styles.photoThumb, { borderColor: active ? colors.primary : colors.border }]}
                        resizeMode="cover"
                      />
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Text style={[styles.label, { color: colors.textMuted, marginTop: 10 }]}>
              URL DE IMAGEN (OPCIONAL)
            </Text>
            <View style={styles.urlRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.urlInput,
                  { color: colors.text, borderColor: colors.border, borderRadius: radius.lg, fontSize: 13 },
                ]}
                placeholder="https://images.unsplash.com/…"
                placeholderTextColor={colors.textMuted}
                value={customUrl}
                onChangeText={(text) => {
                  setCustomUrl(text);
                  setSelectedUnsplashId(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={pickImage}
                disabled={uploading}
                style={[styles.uploadBtn, { borderColor: colors.border, borderRadius: radius.lg }]}
              >
                {uploading ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={{ fontSize: 18 }}>📤</Text>
                )}
              </Pressable>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 11, lineHeight: 16 }}>
              Elige una foto de Unsplash, pega una URL o sube una imagen desde tu galería. Se guarda la ruta tal cual.
            </Text>

            {hasCustom ? (
              <View style={[styles.customPreview, { borderColor: colors.border, borderRadius: radius.lg }]}>
                {customUrl.startsWith('http') && customUrl.includes('unsplash') ? (
                  <Image source={{ uri: previewUri(customUrl) }} style={styles.customPreviewImg} resizeMode="cover" />
                ) : (
                  <AuthedImage uri={customUrl} style={styles.customPreviewImg} resizeMode="cover" />
                )}
                <Text style={{ color: colors.textMuted, fontSize: 11, flex: 1 }} numberOfLines={2}>
                  {customUrl}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Button label="Cancelar" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button
              label={saving ? 'Guardando…' : 'Guardar libreta'}
              onPress={handleSave}
              disabled={saving || uploading || !name.trim()}
              loading={saving}
              style={{ flex: 1 }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: { maxHeight: '94%', overflow: 'hidden' },
  scroll: { padding: 20, gap: 8 },
  heading: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  previewCenter: { alignItems: 'center', marginVertical: 8 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: {
    width: '31%',
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetLabel: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 1,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput: { flex: 1, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  searchBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  hintRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  hintChip: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoCell: { width: '23%', aspectRatio: 3 / 4, borderRadius: 8, overflow: 'hidden' },
  photoThumb: { width: '100%', height: '100%', borderRadius: 8, borderWidth: 2 },
  urlRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  urlInput: { flex: 1 },
  uploadBtn: {
    width: 48,
    height: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    padding: 8,
    marginTop: 4,
  },
  customPreviewImg: { width: 40, height: 54, borderRadius: 6 },
  actions: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 8 },
});
