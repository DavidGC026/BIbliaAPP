import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import {
  IMAGE_FORMATS,
  type ImageFormatId,
  bgImageTransform,
  formatById,
  previewDimensions,
} from '@/lib/verseImageFormats';

const GRADIENTS = [
  { id: 'gold', colors: ['#92400e', '#451a03', '#1c1917'] as const },
  { id: 'sunset', colors: ['#ea580c', '#7c2d12', '#431407'] as const },
  { id: 'ocean', colors: ['#0369a1', '#155e75', '#083344'] as const },
  { id: 'forest', colors: ['#15803d', '#14532d', '#052e16'] as const },
  { id: 'purple', colors: ['#7e22ce', '#4c1d95', '#2e1065'] as const },
  { id: 'night', colors: ['#1d4ed8', '#312e81', '#0f172a'] as const },
] as const;

const SEARCH_HINTS = ['naturaleza', 'cielo', 'mar', 'montaña', 'amanecer', 'flores', 'cruz', 'bosque', 'atardecer', 'lluvia'];

function mergePhotos(prev: api.UnsplashImage[], next: api.UnsplashImage[]) {
  const seen = new Set(prev.map((p) => p.id));
  return [...prev, ...next.filter((p) => !seen.has(p.id))];
}

const PREVIEW_MAX_W = 300;
const PREVIEW_MAX_H = 200;

type BgMode = 'gradient' | 'photo';

function textSizeForLength(len: number) {
  if (len > 220) return 14;
  if (len > 140) return 16;
  if (len > 80) return 17;
  return 19;
}

export function VerseImageCreatorModal({
  visible,
  onClose,
  text,
  reference,
  abbr,
}: {
  visible: boolean;
  onClose: () => void;
  text: string;
  reference: string;
  abbr: string;
}) {
  const { colors, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const contentPadding = useContentPadding(12);
  const shotRef = useRef<ViewShotRef>(null);
  const imageFormatRef = useRef<ImageFormatId>('9:16');
  const [imageFormat, setImageFormat] = useState<ImageFormatId>('9:16');
  const [gradientIdx, setGradientIdx] = useState(0);
  const [bgMode, setBgMode] = useState<BgMode>('gradient');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [bgPosX, setBgPosX] = useState(50);
  const [bgPosY, setBgPosY] = useState(50);
  const [bgZoom, setBgZoom] = useState(100);
  const [unsplashImages, setUnsplashImages] = useState<api.UnsplashImage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState<string | undefined>();
  const [photosPage, setPhotosPage] = useState(1);
  const [hasMorePhotos, setHasMorePhotos] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loadingMorePhotos, setLoadingMorePhotos] = useState(false);
  const [photoReady, setPhotoReady] = useState(true);
  const [exporting, setExporting] = useState(false);
  const gradient = GRADIENTS[gradientIdx];
  const textSize = textSizeForLength(text.length);
  const format = formatById(imageFormat);
  const preview = previewDimensions(format, PREVIEW_MAX_W, PREVIEW_MAX_H);
  imageFormatRef.current = imageFormat;

  const loadPhotos = useCallback(async (
    query?: string,
    page = 1,
    append = false,
    formatId?: ImageFormatId,
  ) => {
    if (page === 1) setLoadingPhotos(true);
    else setLoadingMorePhotos(true);
    try {
      const res = await api.fetchUnsplashImages(query, {
        page,
        orientation: formatById(formatId ?? imageFormatRef.current).unsplashOrientation,
      });
      setUnsplashImages((prev) => (append ? mergePhotos(prev, res.images) : res.images));
      setPhotosPage(page);
      setHasMorePhotos(res.hasMore);
    } catch {
      if (!append) setUnsplashImages([]);
    } finally {
      setLoadingPhotos(false);
      setLoadingMorePhotos(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setSearchQuery('');
    setActiveSearch(undefined);
    setPhotosPage(1);
    setHasMorePhotos(false);
    setBgMode('gradient');
    setPhotoUri(null);
    setSelectedPhotoId(null);
    setGradientIdx(0);
    setImageFormat('9:16');
    setBgPosX(50);
    setBgPosY(50);
    setBgZoom(100);
    loadPhotos(undefined, 1, false);
  }, [visible, loadPhotos]);

  const selectFormat = (id: ImageFormatId) => {
    setImageFormat(id);
    loadPhotos(activeSearch, 1, false, id);
  };

  const selectGradient = (idx: number) => {
    setGradientIdx(idx);
    setBgMode('gradient');
    setPhotoUri(null);
    setSelectedPhotoId(null);
    setPhotoReady(true);
  };

  const selectPhoto = (uri: string, id: string | null) => {
    setBgMode('photo');
    setPhotoUri(uri);
    setSelectedPhotoId(id);
    setPhotoReady(false);
  };

  const pickLocalPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      selectPhoto(result.assets[0].uri, null);
    }
  };

  const runSearch = () => {
    const q = searchQuery.trim() || undefined;
    setActiveSearch(q);
    loadPhotos(q, 1, false);
  };

  const loadMorePhotos = () => {
    if (!hasMorePhotos || loadingMorePhotos) return;
    loadPhotos(activeSearch, photosPage + 1, true);
  };

  const shareImage = async () => {
    if (!shotRef.current?.capture || (bgMode === 'photo' && !photoReady)) return;
    setExporting(true);
    try {
      // ponytail: brief wait so remote Unsplash image finishes painting before capture
      if (bgMode === 'photo' && photoUri?.startsWith('http')) {
        await new Promise((r) => setTimeout(r, 300));
      }
      const uri = await shotRef.current.capture();
      if (!(await Sharing.isAvailableAsync())) return;
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: reference });
      onClose();
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingBottom: Math.max(12, insets.bottom) }]}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: radius.xl, paddingBottom: contentPadding }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Crear imagen</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ color: colors.textMuted, fontSize: 22 }}>×</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollBody, { paddingBottom: 8 }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Formato</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formatRow}>
              {IMAGE_FORMATS.map((fmt) => {
                const active = imageFormat === fmt.id;
                return (
                  <Pressable
                    key={fmt.id}
                    onPress={() => selectFormat(fmt.id)}
                    style={[
                      styles.formatBtn,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? `${colors.primary}18` : colors.muted,
                      },
                    ]}
                  >
                    <View style={{ width: fmt.previewW, height: fmt.previewH, borderWidth: 2, borderColor: active ? colors.primary : colors.textMuted, borderRadius: 3 }} />
                    <Text style={{ color: active ? colors.primary : colors.text, fontSize: 10, fontWeight: '700' }}>{fmt.label}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 8 }}>{fmt.hint}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.previewWrap}>
              <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
                <View style={[styles.card, { width: preview.width, height: preview.height }]}>
                  {bgMode === 'photo' && photoUri ? (
                    <Image
                      source={{ uri: photoUri }}
                      style={[
                        StyleSheet.absoluteFillObject,
                        { transform: bgImageTransform(bgPosX, bgPosY, bgZoom, preview.width, preview.height) },
                      ]}
                      resizeMode="cover"
                      onLoad={() => setPhotoReady(true)}
                    />
                  ) : (
                    <LinearGradient colors={[...gradient.colors]} style={StyleSheet.absoluteFill} />
                  )}
                  <View style={styles.cardOverlay} />
                  <Text style={[styles.cardText, { fontSize: textSize, lineHeight: textSize * 1.45 }]}>
                    "{text}"
                  </Text>
                  <Text style={styles.cardRef}>{reference}</Text>
                  <Text style={styles.cardAbbr}>{abbr}</Text>
                </View>
              </ViewShot>
            </View>

            {bgMode === 'photo' && photoUri ? (
              <View style={[styles.adjustBox, { borderColor: colors.border }]}>
                <Text style={[styles.adjustLabel, { color: colors.textMuted }]}>Zoom {bgZoom}%</Text>
                <View style={styles.adjustRow}>
                  <Pressable onPress={() => setBgZoom((v) => Math.max(100, v - 5))} style={[styles.adjustBtn, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.text }}>−</Text>
                  </Pressable>
                  <Pressable onPress={() => setBgZoom((v) => Math.min(200, v + 5))} style={[styles.adjustBtn, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.text }}>+</Text>
                  </Pressable>
                </View>
                <Text style={[styles.adjustLabel, { color: colors.textMuted }]}>Mover fondo ← →</Text>
                <View style={styles.adjustRow}>
                  <Pressable onPress={() => setBgPosX((v) => Math.max(0, v - 10))} style={[styles.adjustBtn, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.text }}>←</Text>
                  </Pressable>
                  <Pressable onPress={() => setBgPosX((v) => Math.min(100, v + 10))} style={[styles.adjustBtn, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.text }}>→</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Colores</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gradientRow}>
              {GRADIENTS.map((g, i) => (
                <Pressable
                  key={g.id}
                  onPress={() => selectGradient(i)}
                  style={[
                    styles.gradientSwatch,
                    bgMode === 'gradient' && i === gradientIdx && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                >
                  <LinearGradient colors={[...g.colors]} style={StyleSheet.absoluteFill} />
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Fotos (Unsplash)</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.searchInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.muted }]}
                placeholder="Buscar fondo (mar, cielo, cruz…)"
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={runSearch}
                returnKeyType="search"
              />
              <Pressable
                style={[styles.searchBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
                onPress={runSearch}
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
                      backgroundColor: activeSearch === hint ? `${colors.primary}18` : colors.muted,
                    },
                  ]}
                  onPress={() => {
                    setSearchQuery(hint);
                    setActiveSearch(hint);
                    loadPhotos(hint, 1, false);
                  }}
                >
                  <Text style={{ color: activeSearch === hint ? colors.primary : colors.textMuted, fontSize: 12 }}>
                    {hint}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.photoGrid}>
              <Pressable
                style={[styles.photoThumb, styles.uploadThumb, { borderColor: colors.border }]}
                onPress={pickLocalPhoto}
              >
                <Text style={{ color: colors.textMuted, fontSize: 22 }}>+</Text>
                <Text style={{ color: colors.textMuted, fontSize: 10 }}>Galería</Text>
              </Pressable>

              {loadingPhotos ? (
                <View style={[styles.photoThumb, styles.loadingThumb]}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                unsplashImages.map((img) => (
                  <Pressable
                    key={img.id}
                    onPress={() => selectPhoto(img.url, img.id)}
                    style={[
                      styles.photoThumb,
                      bgMode === 'photo' && selectedPhotoId === img.id && {
                        borderColor: colors.primary,
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <Image source={{ uri: img.thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  </Pressable>
                ))
              )}
            </View>

            {hasMorePhotos && !loadingPhotos ? (
              <Pressable
                style={[styles.loadMoreBtn, { borderColor: colors.border }]}
                onPress={loadMorePhotos}
                disabled={loadingMorePhotos}
              >
                {loadingMorePhotos ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>Cargar más fotos</Text>
                )}
              </Pressable>
            ) : null}
          </ScrollView>

          <Pressable
            style={[
              styles.shareBtn,
              { backgroundColor: colors.primary, borderRadius: radius.full, opacity: bgMode === 'photo' && !photoReady ? 0.6 : 1 },
            ]}
            onPress={shareImage}
            disabled={exporting || (bgMode === 'photo' && !photoReady)}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.shareBtnText}>Compartir imagen</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { padding: 20, gap: 12, maxHeight: '94%' },
  scrollBody: { gap: 10, paddingBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  previewWrap: { alignItems: 'center' },
  formatRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  formatBtn: { alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 8 },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustBox: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 6 },
  adjustLabel: { fontSize: 11, fontWeight: '600' },
  adjustRow: { flexDirection: 'row', gap: 8 },
  adjustBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  cardOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cardText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
    zIndex: 1,
  },
  cardRef: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
    zIndex: 1,
  },
  cardAbbr: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    marginTop: 6,
    zIndex: 1,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  gradientRow: { flexDirection: 'row', gap: 10, paddingVertical: 2 },
  gradientSwatch: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  searchBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  hintRow: { flexDirection: 'row', gap: 8 },
  hintChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: 72, height: 90, borderRadius: 8, overflow: 'hidden', backgroundColor: '#222' },
  uploadThumb: { borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
  loadingThumb: { alignItems: 'center', justifyContent: 'center' },
  loadMoreBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: { paddingVertical: 14, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
