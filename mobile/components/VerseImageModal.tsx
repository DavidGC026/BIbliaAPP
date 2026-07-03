import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { useAppTheme } from '@/hooks/useAppTheme';
import { useContentPadding } from '@/hooks/useContentPadding';
import * as api from '@/lib/api';
import type { UnsplashImage } from '@/lib/types';
import {
  IMAGE_FORMATS,
  type ImageFormatId,
  bgImageTransform,
  formatById,
  previewDimensions,
} from '@/lib/verseImageFormats';

interface VerseImageModalProps {
  visible: boolean;
  text: string;
  reference: string;
  theme: string;
  abbr: string;
  onClose: () => void;
}

type EditorTab = 'format' | 'backgrounds' | 'settings';

interface GradientPreset {
  id: string;
  name: string;
  colors: [string, string, string, string];
  swatch: [string, string];
}

const GRADIENTS: GradientPreset[] = [
  { id: 'gold', name: 'Oro', colors: ['#92400e', '#78350f', '#451a03', '#1c1917'], swatch: ['#fbbf24', '#92400e'] },
  { id: 'sunset', name: 'Atardecer', colors: ['#ea580c', '#c2410c', '#7c2d12', '#431407'], swatch: ['#fb923c', '#dc2626'] },
  { id: 'ocean', name: 'Océano', colors: ['#0369a1', '#0e7490', '#155e75', '#083344'], swatch: ['#38bdf8', '#0369a1'] },
  { id: 'forest', name: 'Bosque', colors: ['#15803d', '#166534', '#14532d', '#052e16'], swatch: ['#4ade80', '#15803d'] },
  { id: 'purple', name: 'Púrpura', colors: ['#7e22ce', '#6d28d9', '#4c1d95', '#2e1065'], swatch: ['#c084fc', '#7c3aed'] },
  { id: 'rose', name: 'Rosa', colors: ['#e11d48', '#be123c', '#881337', '#4c0519'], swatch: ['#fb7185', '#e11d48'] },
  { id: 'night', name: 'Noche', colors: ['#1d4ed8', '#4338ca', '#312e81', '#0f172a'], swatch: ['#60a5fa', '#4338ca'] },
  { id: 'earth', name: 'Tierra', colors: ['#a16207', '#854d0e', '#713f12', '#292524'], swatch: ['#fcd34d', '#a16207'] },
];

const SEARCH_HINTS = ['naturaleza', 'cielo', 'mar', 'montaña', 'amanecer', 'flores', 'cruz', 'bosque', 'atardecer', 'lluvia'];
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const AMBER = '#fbbf24';

function mergePhotos(prev: UnsplashImage[], next: UnsplashImage[]) {
  const seen = new Set(prev.map((p) => p.id));
  return [...prev, ...next.filter((p) => !seen.has(p.id))];
}

function autoTextSize(text: string) {
  if (text.length > 220) return 15;
  if (text.length > 140) return 17;
  if (text.length > 80) return 19;
  return 22;
}

function VerseImageCard({
  text,
  reference,
  abbr,
  gradient,
  photoUri,
  bgBlur,
  overlayOpacity,
  textSize,
  cardWidth,
  cardHeight,
  imageFormat,
  bgPosX,
  bgPosY,
  bgZoom,
  onPhotoLoad,
}: {
  text: string;
  reference: string;
  abbr: string;
  gradient: GradientPreset;
  photoUri: string | null;
  bgBlur: number;
  overlayOpacity: number;
  textSize: number;
  cardWidth: number;
  cardHeight: number;
  imageFormat: ImageFormatId;
  bgPosX: number;
  bgPosY: number;
  bgZoom: number;
  onPhotoLoad?: () => void;
}) {
  // El diseño replica components/verse-image-creator.tsx: escala todo según el ancho.
  const scale = cardWidth / 270;
  const scaledText = Math.round(textSize * scale);
  const pad = cardWidth * 0.08;

  return (
    <View
      style={{
        width: cardWidth,
        height: cardHeight,
        overflow: 'hidden',
        borderRadius: imageFormat === '9:16' ? 0 : Math.round(16 * scale),
        backgroundColor: gradient.colors[0],
      }}
    >
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={[
            StyleSheet.absoluteFillObject,
            { transform: bgImageTransform(bgPosX, bgPosY, bgZoom, cardWidth, cardHeight) },
          ]}
          resizeMode="cover"
          blurRadius={bgBlur}
          onLoad={onPhotoLoad}
        />
      ) : (
        <LinearGradient
          colors={gradient.colors}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Oscurecido + viñeta aproximada */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: overlayOpacity / 100 }]} />
      <LinearGradient
        colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.35)']}
        style={StyleSheet.absoluteFill}
      />
      {/* Resplandor superior ámbar */}
      <LinearGradient
        colors={['rgba(251,191,36,0.12)', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%' }}
      />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: pad }}>
        <Text
          style={{
            fontFamily: SERIF,
            fontSize: scaledText * 2.2,
            lineHeight: scaledText * 2.2,
            color: 'rgba(251,191,36,0.25)',
            marginBottom: scaledText * 0.2,
          }}
        >
          “
        </Text>

        <Text
          style={{
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontSize: scaledText,
            lineHeight: scaledText * 1.55,
            color: '#ffffff',
            textAlign: 'center',
            textShadowColor: 'rgba(0,0,0,0.5)',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 20,
            marginBottom: scaledText * 0.6,
            maxWidth: '92%',
          }}
        >
          {text}
        </Text>

        <LinearGradient
          colors={['transparent', AMBER, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            width: scaledText * 1.8,
            height: Math.max(2, scale * 2),
            borderRadius: 999,
            marginBottom: scaledText * 0.45,
          }}
        />

        <Text
          style={{
            fontWeight: '600',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: 'rgba(251,191,36,0.9)',
            fontSize: Math.max(11, scaledText * 0.48),
            textShadowColor: 'rgba(0,0,0,0.4)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 8,
            textAlign: 'center',
          }}
        >
          {reference}
        </Text>
        <Text
          style={{
            marginTop: scaledText * 0.2,
            fontWeight: '500',
            letterSpacing: 1,
            color: 'rgba(255,255,255,0.55)',
            fontSize: Math.max(10, scaledText * 0.38),
          }}
        >
          {abbr}
        </Text>
      </View>
    </View>
  );
}

function Stepper({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
  colors,
  radius,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
  radius: ReturnType<typeof useAppTheme>['radius'];
}) {
  return (
    <View style={[styles.settingRow, { borderColor: colors.border, borderRadius: radius.lg }]}>
      <Text style={[styles.settingLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          style={[styles.stepBtn, { borderColor: colors.border }]}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Text style={[styles.stepBtnText, { color: colors.text }]}>−</Text>
        </Pressable>
        <Text style={[styles.stepValue, { color: colors.primary }]}>
          {value}
          {unit}
        </Text>
        <Pressable
          style={[styles.stepBtn, { borderColor: colors.border }]}
          onPress={() => onChange(Math.min(max, value + step))}
        >
          <Text style={[styles.stepBtnText, { color: colors.text }]}>＋</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function VerseImageModal({ visible, text, reference, theme, abbr, onClose }: VerseImageModalProps) {
  const { colors, radius } = useAppTheme();
  const insets = useSafeAreaInsets();
  const contentPadding = useContentPadding(12);
  const [gradient, setGradient] = useState<GradientPreset>(GRADIENTS[0]);
  const [photos, setPhotos] = useState<UnsplashImage[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loadingMorePhotos, setLoadingMorePhotos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState<string | undefined>();
  const [photosPage, setPhotosPage] = useState(1);
  const [hasMorePhotos, setHasMorePhotos] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [photoReady, setPhotoReady] = useState(false);
  const [imageFormat, setImageFormat] = useState<ImageFormatId>('9:16');
  const [textSize, setTextSize] = useState(20);
  const [overlayOpacity, setOverlayOpacity] = useState(35);
  const [bgBlur, setBgBlur] = useState(0);
  const [bgPosX, setBgPosX] = useState(50);
  const [bgPosY, setBgPosY] = useState(50);
  const [bgZoom, setBgZoom] = useState(100);
  const [editorTab, setEditorTab] = useState<EditorTab>('backgrounds');
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<View>(null);
  const imageFormatRef = useRef(imageFormat);
  imageFormatRef.current = imageFormat;

  const isPhoto = !!photoUrl;

  useEffect(() => {
    if (!visible) return;
    setTextSize(autoTextSize(text));
  }, [visible, text]);

  const loadPhotos = useCallback(async (
    query: string | undefined,
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
      setPhotos((prev) => (append ? mergePhotos(prev, res.images) : res.images));
      setPhotosPage(page);
      setHasMorePhotos(res.hasMore);
    } catch {
      if (!append) setPhotos([]);
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
    loadPhotos(undefined, 1, false);
  }, [visible, loadPhotos]);

  const runSearch = () => {
    const q = searchQuery.trim() || undefined;
    setActiveSearch(q);
    loadPhotos(q, 1, false);
  };

  const loadMorePhotos = () => {
    if (!hasMorePhotos || loadingMorePhotos) return;
    loadPhotos(activeSearch, photosPage + 1, true);
  };

  const selectFormat = (id: ImageFormatId) => {
    setImageFormat(id);
    loadPhotos(activeSearch, 1, false, id);
  };

  const selectGradient = (g: GradientPreset) => {
    setGradient(g);
    setPhotoUrl(null);
    setSelectedPhotoId(null);
    setPhotoReady(false);
  };

  const selectPhoto = (img: UnsplashImage) => {
    setPhotoUrl(api.getImageProxyUrl(img.url));
    setSelectedPhotoId(img.id);
    setPhotoReady(false);
  };

  const shareImage = async () => {
    if (!cardRef.current) return;
    if (isPhoto && !photoReady) return;
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 120));
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      }
    } catch {
      // Ignorar cancelaciones
    } finally {
      setBusy(false);
    }
  };

  const screen = Dimensions.get('window');
  const previewMaxW = screen.width - 48;
  const previewMaxH = screen.height * 0.4;
  const format = formatById(imageFormat);
  const preview = previewDimensions(format, previewMaxW, previewMaxH);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: '#09090b' }]}>
        <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.headerBtn}>
            <Text style={styles.headerClose}>✕</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerEyebrow}>EDITOR</Text>
            <Text style={styles.headerTitle}>Crear imagen</Text>
          </View>
          <Pressable
            style={[styles.shareBtn, { backgroundColor: colors.primary, opacity: busy || (isPhoto && !photoReady) ? 0.6 : 1 }]}
            disabled={busy || (isPhoto && !photoReady)}
            onPress={shareImage}
          >
            <Text style={styles.shareBtnText}>{busy ? '…' : 'Compartir'}</Text>
          </Pressable>
        </View>

        <View style={styles.preview}>
          <View ref={cardRef} collapsable={false}>
            <VerseImageCard
              text={text}
              reference={reference}
              abbr={abbr}
              gradient={gradient}
              photoUri={photoUrl}
              bgBlur={bgBlur}
              overlayOpacity={overlayOpacity}
              textSize={textSize}
              cardWidth={preview.width}
              cardHeight={preview.height}
              imageFormat={imageFormat}
              bgPosX={bgPosX}
              bgPosY={bgPosY}
              bgZoom={bgZoom}
              onPhotoLoad={() => setPhotoReady(true)}
            />
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.grabber} />

          <ScrollView style={styles.panelBody} contentContainerStyle={{ paddingBottom: contentPadding }}>
            {editorTab === 'format' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formatRow}>
                {IMAGE_FORMATS.map((fmt) => {
                  const active = imageFormat === fmt.id;
                  return (
                    <Pressable
                      key={fmt.id}
                      style={[
                        styles.formatBtn,
                        { borderColor: active ? colors.primary : 'rgba(255,255,255,0.12)', backgroundColor: active ? 'rgba(251,191,36,0.1)' : 'transparent' },
                      ]}
                      onPress={() => selectFormat(fmt.id)}
                    >
                      <View style={{ width: fmt.previewW, height: fmt.previewH, borderWidth: 2, borderColor: active ? colors.primary : 'rgba(255,255,255,0.5)', borderRadius: 3 }} />
                      <Text style={{ color: active ? colors.primary : 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 12 }}>{fmt.label}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9 }}>{fmt.hint}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            {editorTab === 'backgrounds' ? (
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={styles.groupLabel}>COLORES</Text>
                  <View style={styles.swatchGrid}>
                    {GRADIENTS.map((g) => {
                      const active = !isPhoto && gradient.id === g.id;
                      return (
                        <Pressable key={g.id} onPress={() => selectGradient(g)} style={styles.swatchCell}>
                          <LinearGradient
                            colors={g.swatch}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.swatch, { borderColor: active ? colors.primary : 'rgba(255,255,255,0.12)' }]}
                          />
                          <Text style={styles.swatchLabel} numberOfLines={1}>{g.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text style={styles.groupLabel}>FOTOS (UNSPLASH)</Text>

                  <View style={styles.searchRow}>
                    <TextInput
                      style={[styles.searchInput, { borderColor: 'rgba(255,255,255,0.12)', color: '#fff', backgroundColor: 'rgba(255,255,255,0.05)' }]}
                      placeholder="Buscar fondo (mar, cielo, cruz…)"
                      placeholderTextColor="rgba(255,255,255,0.35)"
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
                            borderColor: activeSearch === hint ? colors.primary : 'rgba(255,255,255,0.12)',
                            backgroundColor: activeSearch === hint ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.05)',
                          },
                        ]}
                        onPress={() => {
                          setSearchQuery(hint);
                          setActiveSearch(hint);
                          loadPhotos(hint, 1, false);
                        }}
                      >
                        <Text style={{ color: activeSearch === hint ? colors.primary : 'rgba(255,255,255,0.55)', fontSize: 11 }}>
                          {hint}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  {loadingPhotos ? (
                    <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
                  ) : (
                    <>
                      <View style={styles.swatchGrid}>
                        {photos.map((img) => {
                          const active = isPhoto && selectedPhotoId === img.id;
                          return (
                            <Pressable key={img.id} onPress={() => selectPhoto(img)} style={styles.swatchCell}>
                              <Image
                                source={{ uri: img.thumb }}
                                style={[styles.photoSwatch, { borderColor: active ? colors.primary : 'rgba(255,255,255,0.12)' }]}
                              />
                            </Pressable>
                          );
                        })}
                      </View>
                      {hasMorePhotos ? (
                        <Pressable
                          style={[styles.loadMoreBtn, { borderColor: 'rgba(255,255,255,0.12)' }]}
                          onPress={loadMorePhotos}
                          disabled={loadingMorePhotos}
                        >
                          {loadingMorePhotos ? (
                            <ActivityIndicator color={colors.primary} size="small" />
                          ) : (
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' }}>
                              Cargar más fotos
                            </Text>
                          )}
                        </Pressable>
                      ) : null}
                    </>
                  )}
                </View>
              </View>
            ) : null}

            {editorTab === 'settings' ? (
              <View style={{ gap: 12 }}>
                <Stepper label="TAMAÑO DE LETRA" value={textSize} unit="" min={12} max={36} step={1} onChange={setTextSize} colors={colors} radius={radius} />
                <Stepper label="OSCURECER FONDO" value={overlayOpacity} unit="%" min={0} max={80} step={5} onChange={setOverlayOpacity} colors={colors} radius={radius} />
                {isPhoto ? (
                  <>
                    <Stepper label="DIFUMINAR FOTO" value={bgBlur} unit="" min={0} max={20} step={1} onChange={setBgBlur} colors={colors} radius={radius} />
                    <Stepper label="ZOOM FONDO" value={bgZoom} unit="%" min={100} max={200} step={5} onChange={setBgZoom} colors={colors} radius={radius} />
                    <Stepper label="POS. HORIZONTAL" value={bgPosX} unit="%" min={0} max={100} step={5} onChange={setBgPosX} colors={colors} radius={radius} />
                    <Stepper label="POS. VERTICAL" value={bgPosY} unit="%" min={0} max={100} step={5} onChange={setBgPosY} colors={colors} radius={radius} />
                  </>
                ) : null}
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.tabBar, { paddingBottom: 12 + insets.bottom }]}>
            {([
              { tab: 'format' as EditorTab, label: 'Formato' },
              { tab: 'backgrounds' as EditorTab, label: 'Fondos' },
              { tab: 'settings' as EditorTab, label: 'Ajustes' },
            ]).map(({ tab, label }) => {
              const active = editorTab === tab;
              return (
                <Pressable
                  key={tab}
                  style={[styles.tabBtn, active && { backgroundColor: 'rgba(251,191,36,0.1)' }]}
                  onPress={() => setEditorTab(tab)}
                >
                  <Text style={{ color: active ? colors.primary : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerBtn: { width: 60 },
  headerClose: { color: 'rgba(255,255,255,0.7)', fontSize: 20 },
  headerEyebrow: { color: 'rgba(251,191,36,0.8)', fontSize: 10, fontWeight: '600', letterSpacing: 2 },
  headerTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 2 },
  shareBtn: { width: 96, alignItems: 'center', borderRadius: 999, paddingVertical: 9 },
  shareBtnText: { color: '#1c1917', fontWeight: '700', fontSize: 13 },
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  panel: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    maxHeight: '44%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 8, marginBottom: 4 },
  panelBody: { paddingHorizontal: 16, paddingTop: 8 },
  formatRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, paddingHorizontal: 4 },
  formatBtn: { alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14 },
  groupLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatchCell: { width: 56, alignItems: 'center', gap: 4 },
  swatch: { width: 56, height: 56, borderRadius: 10, borderWidth: 2 },
  swatchLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 9, textAlign: 'center' },
  photoSwatch: { width: 56, height: 70, borderRadius: 10, borderWidth: 2 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
  searchInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  searchBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  searchBtnText: { color: '#1c1917', fontWeight: '700', fontSize: 13 },
  hintRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  hintChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  loadMoreBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingRow: { borderWidth: 1, padding: 14, gap: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 18, fontWeight: '700' },
  stepValue: { fontSize: 14, fontWeight: '700', minWidth: 44, textAlign: 'center' },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  tabBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12 },
});
