import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Type,
  ImageIcon,
  Square,
  Circle as CircleIcon,
  Trash2,
  Undo2,
  Redo2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Plus,
  Layers,
  Copy,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sticker,
  Pen,
  Triangle,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Move,
  RefreshCw,
} from 'lucide-react-native';

// ─── Types ───────────────────────────────────────────

export type ElementType = 'text' | 'image' | 'shape' | 'sticker' | 'drawing';

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  locked?: boolean;
  // text
  text?: string;
  fontSize?: number;
  fontColor?: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  // image
  imageUri?: string;
  /** How the image fills its bounding box: 'contain' (default — fit), 'cover' (fill), or 'stretch'. */
  imageFit?: 'contain' | 'cover' | 'stretch';
  /** Original aspect ratio captured at upload (width/height) — used by Fit/Fill helpers. */
  imageAspect?: number;
  // shape
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'line';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  borderRadius?: number;
  // sticker
  emoji?: string;
  // drawing
  pathData?: string;
  drawColor?: string;
  drawWidth?: number;
}

export interface PrintArea {
  /** All values are 0-1 percentages of canvas width/height */
  left: number;
  top: number;
  right: number;
  bottom: number;
  /** Optional shape hint for visual outline (rect or oval) */
  shape?: 'rect' | 'oval';
  /** Optional label shown on the print zone */
  label?: string;
  /**
   * How the design wraps onto the product surface.
   * - 'flat'        — flat surface (cards, posters, tshirt front)
   * - 'cylindrical' — wraps around a cylinder (mug, bottle, tumbler, can)
   * - 'fabric'      — soft fabric weave shading (tshirt, bag, hoodie)
   * - 'curved'      — gentle curvature (caps, phone-case backs)
   */
  wrap?: 'flat' | 'cylindrical' | 'fabric' | 'curved';
  /**
   * 0 = perfectly flat, 1 = extreme curvature.
   * Controls the strength of the wrap simulation (lighting + scale).
   */
  curvature?: number;
}

interface Props {
  productImage?: string;
  /**
   * Natural pixel size of `productImage` from `Image.getSize` (or equivalent).
   * When set, `printArea` left/top/right/bottom are interpreted as fractions of
   * this **visible** product box (the same rectangle React Native uses for
   * `resizeMode="contain"`), not the raw canvas. This matches how real
   * mockups work in apps like printshoppy.
   */
  productNaturalSize?: { width: number; height: number } | null;
  canvasWidth: number;
  canvasHeight: number;
  accentColor: string;
  themeColors: any;
  themeMode: 'light' | 'dark';
  /** Where the design prints: 0–1 fractions of the fitted product image (see `productNaturalSize`). */
  printArea?: PrintArea;
  onDesignChange?: (elements: CanvasElement[]) => void;
  onExport?: (uri: string) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

const PRESET_COLORS = [
  'transparent',
  '#000000', '#FFFFFF', '#333333', '#666666', '#999999',
  '#EF4444', '#DC2626', '#F97316', '#EAB308', '#A3E635',
  '#22C55E', '#059669', '#14B8A6', '#0F766E', '#06B6D4',
  '#3B82F6', '#2563EB', '#6366F1', '#8B5CF6', '#7C3AED',
  '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#FB923C',
];

const STICKER_LIST = [
  '❤️', '⭐', '🔥', '✨', '🎉', '🎁', '👍', '😀',
  '🌟', '💎', '🏆', '🎨', '📸', '💐', '🎂', '🌈',
  '☀️', '🌙', '❄️', '🍀', '🦋', '🐾', '💫', '🎵',
];

const DRAW_WIDTHS = [2, 4, 6, 10];

const uid = () => `el_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Pixel rect where `resizeMode="contain"` actually draws the image inside the canvas. */
function computeImageContainRect(
  containerW: number,
  containerH: number,
  intrinsicW: number,
  intrinsicH: number,
): { x: number; y: number; w: number; h: number } {
  if (!containerW || !containerH || !intrinsicW || !intrinsicH) {
    return { x: 0, y: 0, w: containerW, h: containerH };
  }
  const scale = Math.min(containerW / intrinsicW, containerH / intrinsicH);
  const w = intrinsicW * scale;
  const h = intrinsicH * scale;
  const x = (containerW - w) / 2;
  const y = (containerH - h) / 2;
  return { x, y, w, h };
}

export interface CanvasEditorHandle {
  exportCanvas: () => Promise<string | null>;
}

// ─── Main Component ──────────────────────────────────

export const CanvasEditor = forwardRef<CanvasEditorHandle, Props>(function CanvasEditor({
  productImage,
  productNaturalSize,
  canvasWidth,
  canvasHeight,
  accentColor,
  themeColors: t,
  themeMode,
  printArea,
  onDesignChange,
  onExport,
  onInteractionStart,
  onInteractionEnd,
}, ref) {
  // ─── Print Zone (where the design will actually print on the product) ────
  // The user can resize the print area by dragging the corner handles. When
  // `userPrintArea` is set, it overrides the preset coming from props.
  const [userPrintArea, setUserPrintArea] = useState<{ left: number; top: number; right: number; bottom: number } | null>(null);
  const [editingPrintArea, setEditingPrintArea] = useState(false);

  const imageRect = useMemo(() => {
    if (
      productImage &&
      productNaturalSize &&
      productNaturalSize.width > 0 &&
      productNaturalSize.height > 0
    ) {
      return computeImageContainRect(
        canvasWidth,
        canvasHeight,
        productNaturalSize.width,
        productNaturalSize.height,
      );
    }
    return { x: 0, y: 0, w: canvasWidth, h: canvasHeight };
  }, [productImage, productNaturalSize, canvasWidth, canvasHeight]);

  const printZone = useMemo(() => {
    const pa = printArea ?? { left: 0.08, top: 0.10, right: 0.92, bottom: 0.90, shape: 'rect' as const };
    const src = userPrintArea ?? pa;
    const left = clamp(src.left, 0, 1);
    const top = clamp(src.top, 0, 1);
    const right = clamp(src.right, left + 0.05, 1);
    const bottom = clamp(src.bottom, top + 0.05, 1);
    const shape = pa.shape ?? 'rect';

    // Map normalized print bounds → canvas pixels using the **fitted** product
    // image rect (letterbox-aware), not the full canvas.
    let x = imageRect.x + left * imageRect.w;
    let y = imageRect.y + top * imageRect.h;
    let w = (right - left) * imageRect.w;
    let h = (bottom - top) * imageRect.h;

    // ── Force a true CIRCLE for oval-shaped products (clock, plate, coaster).
    // Without this, the borderRadius mask becomes a stretched ellipse on
    // non-square canvases. Printshoppy's wall-clock face is a true circle,
    // so we shrink the bounding box to a square centered on the same point.
    if (shape === 'oval') {
      const side = Math.min(w, h);
      x = x + (w - side) / 2;
      y = y + (h - side) / 2;
      w = side;
      h = side;
    }

    return {
      x, y, w, h,
      cx: x + w / 2,
      cy: y + h / 2,
      // Normalized bounds in **image** space (0–1 of fitted product rect)
      left, top, right, bottom,
      shape,
      label: pa.label ?? 'Print Area',
      wrap: pa.wrap ?? 'flat',
      curvature: clamp(pa.curvature ?? 0, 0, 1),
    };
  }, [printArea, userPrintArea, imageRect]);

  const resetPrintArea = useCallback(() => {
    setUserPrintArea(null);
    setEditingPrintArea(false);
  }, []);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<CanvasElement[][]>([[]]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const [zoom, setZoom] = useState(1);
  const [drawMode, setDrawMode] = useState(false);
  const [drawColor, setDrawColor] = useState('#000000');
  const [drawWidth, setDrawWidth] = useState(4);
  const drawPoints = useRef<string>('');
  const historyIdxRef = useRef(0);

  const [textEditModal, setTextEditModal] = useState(false);
  const [editText, setEditText] = useState('');
  const [colorPickerTarget, setColorPickerTarget] = useState<'font' | 'fill' | 'stroke' | 'draw' | null>(null);
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showDrawSettings, setShowDrawSettings] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const canvasRef = useRef<any>(null);

  const selected = useMemo(
    () => elements.find((e) => e.id === selectedId) ?? null,
    [elements, selectedId],
  );

  // ─── History ─────────────────────────────────────────

  const MAX_HISTORY = 50;

  const pushHistory = useCallback((next: CanvasElement[]) => {
    setHistory((h) => {
      const sliced = h.slice(0, historyIdx + 1);
      const updated = [...sliced, next];
      if (updated.length > MAX_HISTORY) return updated.slice(updated.length - MAX_HISTORY);
      return updated;
    });
    setHistoryIdx((i) => {
      const newIdx = i + 1;
      return newIdx >= MAX_HISTORY ? MAX_HISTORY - 1 : newIdx;
    });
    historyIdxRef.current = Math.min(historyIdx + 1, MAX_HISTORY - 1);
  }, [historyIdx]);

  const updateElements = useCallback((next: CanvasElement[]) => {
    setElements(next);
    pushHistory(next);
    onDesignChange?.(next);
  }, [pushHistory, onDesignChange]);

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const newIdx = historyIdx - 1;
    setHistoryIdx(newIdx);
    historyIdxRef.current = newIdx;
    setElements(history[newIdx]);
    onDesignChange?.(history[newIdx]);
    setSelectedId(null);
  }, [history, historyIdx, onDesignChange]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const newIdx = historyIdx + 1;
    setHistoryIdx(newIdx);
    historyIdxRef.current = newIdx;
    setElements(history[newIdx]);
    onDesignChange?.(history[newIdx]);
    setSelectedId(null);
  }, [history, historyIdx, onDesignChange]);

  // ─── Zoom ──────────────────────────────────────────

  const zoomIn = useCallback(() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2))), []);
  const zoomReset = useCallback(() => setZoom(1), []);

  // ─── Add Element ───────────────────────────────────

  const addText = useCallback(() => {
    setDrawMode(false);
    const w = Math.min(150, printZone.w * 0.7);
    const h = 40;
    const el: CanvasElement = {
      id: uid(), type: 'text',
      x: printZone.cx - w / 2, y: printZone.cy - h / 2,
      width: w, height: h, rotation: 0, opacity: 1, zIndex: elements.length + 1,
      text: 'Your Text', fontSize: 18, fontColor: '#000000',
      fontBold: false, fontItalic: false, textAlign: 'center',
    };
    updateElements([...elements, el]);
    setSelectedId(el.id);
  }, [printZone, elements, updateElements]);

  const addImage = useCallback(async () => {
    setDrawMode(false);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const aspect = (asset.width || 1) / (asset.height || 1);

    // ── Choose the smartest auto-fit per product shape (printshoppy-style) ──
    // • Round faces (wall clock, plate, coaster) AUTO-FILL — the clip mask
    //   makes the photo become the clock face exactly like printshoppy does.
    // • Cylindrical wraps (mug, bottle) AUTO-FILL too — the photo wraps the
    //   whole printable surface and the 3D transform bends it round the curve.
    // • Flat / fabric / curved patches (cards, t-shirts, caps, frames) FIT
    //   so the user's whole photo is visible — no surprise cropping.
    const autoFill =
      printZone.shape === 'oval' ||
      printZone.wrap === 'cylindrical';
    const fitMode: 'cover' | 'contain' = autoFill ? 'cover' : 'contain';

    let w: number;
    let h: number;
    if (autoFill) {
      // Cover: image grows so the SHORTER side meets the print edge — the
      // longer side overflows and gets clipped by the shape mask.
      w = printZone.w;
      h = w / aspect;
      if (h < printZone.h) { h = printZone.h; w = h * aspect; }
    } else {
      // Contain: image shrinks so the LONGER side meets the print edge —
      // the whole photo stays visible inside the print rectangle.
      w = printZone.w;
      h = w / aspect;
      if (h > printZone.h) { h = printZone.h; w = h * aspect; }
    }

    const el: CanvasElement = {
      id: uid(), type: 'image',
      x: printZone.cx - w / 2,
      y: printZone.cy - h / 2,
      width: w, height: h, rotation: 0, opacity: 1, zIndex: elements.length + 1,
      imageUri: asset.uri,
      imageFit: fitMode,
      imageAspect: aspect,
    };
    updateElements([...elements, el]);
    setSelectedId(el.id);
  }, [printZone, elements, updateElements]);

  // ── Fit / Fill / Stretch helpers for the currently selected image ──────
  // Mirrors printshoppy's "Fit" and "Fill" buttons: Fit shrinks the image so
  // it's fully visible inside the print area; Fill expands it so it covers
  // the print area completely (any overflow is clipped by the print mask).
  const applyImageFit = useCallback((mode: 'contain' | 'cover' | 'stretch') => {
    if (!selectedId) return;
    const el = elements.find((e) => e.id === selectedId);
    if (!el || el.type !== 'image') return;

    const aspect = el.imageAspect ?? (el.width / el.height || 1);
    let w = el.width;
    let h = el.height;

    if (mode === 'stretch') {
      w = printZone.w;
      h = printZone.h;
    } else if (mode === 'contain') {
      w = printZone.w;
      h = w / aspect;
      if (h > printZone.h) { h = printZone.h; w = h * aspect; }
    } else { // cover
      w = printZone.w;
      h = w / aspect;
      if (h < printZone.h) { h = printZone.h; w = h * aspect; }
    }

    setElements((curr) => {
      const next = curr.map((e) =>
        e.id === selectedId
          ? { ...e, width: w, height: h, x: printZone.cx - w / 2, y: printZone.cy - h / 2, imageFit: mode }
          : e
      );
      pushHistory(next);
      onDesignChange?.(next);
      return next;
    });
  }, [selectedId, elements, printZone, pushHistory, onDesignChange]);

  const addShape = useCallback((shape: CanvasElement['shapeType']) => {
    setDrawMode(false);
    const baseSize = Math.min(printZone.w, printZone.h) * 0.5;
    const size = shape === 'line' ? Math.min(120, printZone.w * 0.7) : Math.max(40, baseSize);
    const el: CanvasElement = {
      id: uid(), type: 'shape',
      x: printZone.cx - size / 2, y: printZone.cy - (shape === 'line' ? 2 : size / 2),
      width: size, height: shape === 'line' ? 4 : size,
      rotation: 0, opacity: 1, zIndex: elements.length + 1,
      shapeType: shape, fillColor: shape === 'line' ? accentColor : accentColor + '40',
      strokeColor: accentColor, strokeWidth: 2,
      borderRadius: shape === 'circle' ? 9999 : shape === 'line' ? 2 : 8,
    };
    updateElements([...elements, el]);
    setSelectedId(el.id);
    setShowShapeMenu(false);
  }, [printZone, elements, updateElements, accentColor]);

  const addSticker = useCallback((emoji: string) => {
    setDrawMode(false);
    const size = Math.min(80, Math.min(printZone.w, printZone.h) * 0.4);
    const el: CanvasElement = {
      id: uid(), type: 'sticker',
      x: printZone.cx - size / 2, y: printZone.cy - size / 2,
      width: size, height: size, rotation: 0, opacity: 1, zIndex: elements.length + 1,
      emoji,
    };
    updateElements([...elements, el]);
    setSelectedId(el.id);
    setShowStickerPicker(false);
  }, [printZone, elements, updateElements]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    updateElements(elements.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, elements, updateElements]);

  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    const dup: CanvasElement = { ...selected, id: uid(), x: selected.x + 20, y: selected.y + 20, zIndex: elements.length + 1 };
    updateElements([...elements, dup]);
    setSelectedId(dup.id);
  }, [selected, elements, updateElements]);

  // ─── Update Element Property ───────────────────────

  const updateProp = useCallback((id: string, changes: Partial<CanvasElement>) => {
    const next = elements.map((e) => (e.id === id ? { ...e, ...changes } : e));
    updateElements(next);
  }, [elements, updateElements]);

  const moveElement = useCallback((id: string, x: number, y: number) => {
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, x, y } : e)));
  }, []);

  const commitMove = useCallback((id: string, x: number, y: number) => {
    setElements((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, x, y } : e));
      pushHistory(next);
      onDesignChange?.(next);
      return next;
    });
  }, [pushHistory, onDesignChange]);

  const resizeElement = useCallback((id: string, w: number, h: number) => {
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, width: w, height: h } : e)));
  }, []);

  const commitResize = useCallback((id: string, w: number, h: number) => {
    setElements((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, width: w, height: h } : e));
      pushHistory(next);
      onDesignChange?.(next);
      return next;
    });
  }, [pushHistory, onDesignChange]);

  // ─── Freehand Drawing ──────────────────────────────

  const drawStateRef = useRef({ drawColor, drawWidth });
  useEffect(() => { drawStateRef.current = { drawColor, drawWidth }; }, [drawColor, drawWidth]);

  const drawPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => drawMode,
    onMoveShouldSetPanResponder: () => drawMode,
    onPanResponderGrant: (e) => {
      onInteractionStart?.();
      const { locationX, locationY } = e.nativeEvent;
      drawPoints.current = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
    },
    onPanResponderMove: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      drawPoints.current += ` L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
    },
    onPanResponderRelease: () => {
      if (!drawPoints.current || drawPoints.current.length < 10) {
        onInteractionEnd?.();
        drawPoints.current = '';
        return;
      }
      const { drawColor: dc, drawWidth: dw } = drawStateRef.current;
      const el: CanvasElement = {
        id: uid(), type: 'drawing',
        x: 0, y: 0, width: canvasWidth, height: canvasHeight,
        rotation: 0, opacity: 1, zIndex: 9999,
        pathData: drawPoints.current, drawColor: dc, drawWidth: dw,
      };
      setElements((prev) => {
        const next = [...prev, el];
        setHistory((h) => [...h.slice(0, historyIdxRef.current + 1), next]);
        setHistoryIdx((i) => i + 1);
        historyIdxRef.current += 1;
        onDesignChange?.(next);
        return next;
      });
      onInteractionEnd?.();
      drawPoints.current = '';
    },
  }), [drawMode, canvasWidth, canvasHeight, onDesignChange, onInteractionStart, onInteractionEnd]);

  // ─── Canvas tap to deselect ────────────────────────

  const closeAllMenus = useCallback(() => {
    setShowShapeMenu(false);
    setShowStickerPicker(false);
    setShowDrawSettings(false);
  }, []);

  const canvasPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !drawMode,
    onPanResponderGrant: () => { setSelectedId(null); closeAllMenus(); },
  }), [drawMode, closeAllMenus]);

  // ─── Export ────────────────────────────────────────

  const exportCanvas = useCallback(async (): Promise<string | null> => {
    if (!canvasRef.current) return null;
    const prevZoom = zoom;
    const prevSelected = selectedId;
    setSelectedId(null);
    setIsCapturing(true);
    if (zoom !== 1) setZoom(1);
    await new Promise((r) => setTimeout(r, 220));
    try {
      const uri = await captureRef(canvasRef, {
        format: 'png',
        quality: 1,
        width: canvasWidth * 2,
        height: canvasHeight * 2,
      });
      onExport?.(uri);
      if (prevZoom !== 1) setZoom(prevZoom);
      setSelectedId(prevSelected);
      setIsCapturing(false);
      return uri;
    } catch {
      if (prevZoom !== 1) setZoom(prevZoom);
      setSelectedId(prevSelected);
      setIsCapturing(false);
      return null;
    }
  }, [zoom, selectedId, canvasWidth, canvasHeight, onExport]);

  useImperativeHandle(ref, () => ({ exportCanvas }), [exportCanvas]);

  const sorted = useMemo(
    () => [...elements].sort((a, b) => a.zIndex - b.zIndex),
    [elements],
  );

  // ─── Render ────────────────────────────────────────

  return (
    <View>
      {/* Zoom Controls */}
      <View style={[styles.zoomBar, { backgroundColor: t.card, borderColor: t.border }]}>
        <TouchableOpacity onPress={zoomOut} style={styles.zoomBtn} activeOpacity={0.7}>
          <ZoomOut size={16} color={t.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={zoomReset} activeOpacity={0.7}>
          <Text style={[styles.zoomLabel, { color: t.textPrimary }]}>{Math.round(zoom * 100)}%</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={zoomIn} style={styles.zoomBtn} activeOpacity={0.7}>
          <ZoomIn size={16} color={t.textPrimary} />
        </TouchableOpacity>
        {drawMode && (
          <View style={[styles.drawIndicator, { backgroundColor: drawColor, borderColor: t.border }]} />
        )}
      </View>

      {/* Canvas */}
      <View style={styles.canvasOuter}>
        <View style={{ transform: [{ scale: zoom }] }}>
          {/* Capturable area: product bg + design clipped to print zone */}
          <View
            ref={canvasRef}
            style={[styles.canvas, { width: canvasWidth, height: canvasHeight, backgroundColor: t.chipBg }]}
            collapsable={false}
          >
            {productImage ? (
              <Image source={{ uri: productImage }} style={StyleSheet.absoluteFill} resizeMode="contain" />
            ) : (
              <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                <Maximize2 size={40} color={t.placeholder} style={{ opacity: 0.25 }} />
                <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 13, color: t.placeholder, marginTop: 8 }}>Add your design here</Text>
                <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 11, color: t.placeholder, marginTop: 2 }}>Use toolbar below to add elements</Text>
              </View>
            )}

            {/* Background touch catcher — must come BEFORE design surface so element taps reach elements */}
            <View
              style={StyleSheet.absoluteFill}
              {...(drawMode ? drawPanResponder.panHandlers : canvasPanResponder.panHandlers)}
            />

            {/* ── DESIGN SURFACE: clipped to print zone — this is what physically prints ── */}
            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                left: printZone.x,
                top: printZone.y,
                width: printZone.w,
                height: printZone.h,
                overflow: 'hidden',
                borderRadius: printZone.shape === 'oval' ? Math.min(printZone.w, printZone.h) / 2 : 0,
              }}
            >
              {/* Design content — each element handles its own per-position 3D
                  wrap inside DraggableItem, so this wrapper is just a positional
                  container. Drawings still use the absolute SVG below.            */}
              <View
                pointerEvents="box-none"
                style={{ width: printZone.w, height: printZone.h, position: 'absolute', left: 0, top: 0 }}
              >
                {/* Drawing layer (SVG) — sized to print zone, drawings are in canvas coords so we use viewBox to offset */}
                <Svg
                  width={printZone.w}
                  height={printZone.h}
                  viewBox={`${printZone.x} ${printZone.y} ${printZone.w} ${printZone.h}`}
                  style={{ position: 'absolute', left: 0, top: 0 }}
                  pointerEvents="none"
                >
                  {sorted.filter((el) => el.type === 'drawing' && el.pathData).map((el) => (
                    <Path
                      key={el.id}
                      d={el.pathData!}
                      fill="none"
                      stroke={el.drawColor || '#000'}
                      strokeWidth={el.drawWidth || 4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={el.opacity}
                    />
                  ))}
                </Svg>

                {/* Non-drawing elements (offset so canvas-coord positions render correctly inside clip) */}
                <View
                  pointerEvents="box-none"
                  style={{
                    position: 'absolute',
                    left: -printZone.x,
                    top: -printZone.y,
                    width: canvasWidth,
                    height: canvasHeight,
                  }}
                >
                {sorted.filter((el) => el.type !== 'drawing').map((el) => (
                  <DraggableItem
                    key={el.id}
                    element={el}
                    isSelected={!isCapturing && el.id === selectedId}
                    canvasWidth={canvasWidth}
                    canvasHeight={canvasHeight}
                    accentColor={accentColor}
                    printZone={printZone}
                    onSelect={setSelectedId}
                      onMove={moveElement}
                      onCommitMove={commitMove}
                      onResize={resizeElement}
                      onCommitResize={commitResize}
                      onDoubleTap={() => {
                        if (el.type === 'text') {
                          setSelectedId(el.id);
                          setEditText(el.text || '');
                          setTextEditModal(true);
                        }
                      }}
                      disabled={drawMode}
                      onInteractionStart={onInteractionStart}
                      onInteractionEnd={onInteractionEnd}
                    />
                  ))}
                </View>
              </View>

              {/* ── REALISTIC SURFACE LIGHTING (always rendered, including in export) ──
                  Cylindrical: dark edges + bright center band → mug-wrap illusion.
                  Curved:      single soft highlight band.
                  Fabric:      gentle shadow at the top, soft diffuse below.        */}
              {printZone.wrap === 'cylindrical' && printZone.curvature > 0 && (
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  {/* Strong edge shadow → simulates curving away from viewer */}
                  <LinearGradient
                    colors={[
                      `rgba(0,0,0,${0.55 * printZone.curvature})`,
                      `rgba(0,0,0,${0.18 * printZone.curvature})`,
                      'rgba(0,0,0,0)',
                      'rgba(0,0,0,0)',
                      `rgba(0,0,0,${0.18 * printZone.curvature})`,
                      `rgba(0,0,0,${0.55 * printZone.curvature})`,
                    ]}
                    locations={[0, 0.12, 0.32, 0.68, 0.88, 1]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {/* Bright center highlight → simulates light wrapping over the cylinder */}
                  <LinearGradient
                    colors={[
                      'rgba(255,255,255,0)',
                      `rgba(255,255,255,${0.32 * printZone.curvature})`,
                      'rgba(255,255,255,0)',
                    ]}
                    locations={[0.30, 0.5, 0.70]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {/* Subtle vertical falloff so the top/bottom edges of the wrap blend */}
                  <LinearGradient
                    colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.10)']}
                    locations={[0, 0.4, 1]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              )}
              {printZone.wrap === 'curved' && printZone.curvature > 0 && (
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <LinearGradient
                    colors={[
                      `rgba(0,0,0,${0.22 * printZone.curvature})`,
                      `rgba(255,255,255,${0.20 * printZone.curvature})`,
                      `rgba(0,0,0,${0.22 * printZone.curvature})`,
                    ]}
                    locations={[0.18, 0.5, 0.82]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              )}
              {printZone.wrap === 'fabric' && (
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <LinearGradient
                    colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.10)']}
                    locations={[0, 0.45, 1]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {/* Soft vignette to blend the design into the fabric weave */}
                  <LinearGradient
                    colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.08)']}
                    locations={[0, 0.5, 1]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              )}
            </View>

            {/* ── Print Zone outline + label (UI only — hidden during capture) ── */}
            {!isCapturing && (
              <View
                pointerEvents={editingPrintArea ? 'box-none' : 'none'}
                style={StyleSheet.absoluteFill}
              >
                {/* Outline */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: printZone.x,
                    top: printZone.y,
                    width: printZone.w,
                    height: printZone.h,
                    borderWidth: editingPrintArea ? 2 : 1.5,
                    borderColor: editingPrintArea ? accentColor : accentColor + 'AA',
                    borderStyle: 'dashed',
                    borderRadius: printZone.shape === 'oval' ? Math.min(printZone.w, printZone.h) / 2 : 6,
                  }}
                />

                {/* Floating label */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: printZone.x,
                    top: Math.max(2, printZone.y - 18),
                    backgroundColor: accentColor,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ color: '#FFF', fontFamily: 'Poppins_600SemiBold', fontSize: 9, letterSpacing: 0.3 }}>
                    {printZone.label.toUpperCase()}
                  </Text>
                </View>

                {/* ── Resize handles (only visible while editing) ─────────
                    Drag any of the 4 corners to grow/shrink the print area.
                    Saved as `userPrintArea` (overrides the product preset). */}
                {editingPrintArea && (
                  <PrintAreaHandles
                    printZone={printZone}
                    imageRect={imageRect}
                    norm={{
                      left: printZone.left,
                      top: printZone.top,
                      right: printZone.right,
                      bottom: printZone.bottom,
                    }}
                    accentColor={accentColor}
                    onChange={(next) => setUserPrintArea(next)}
                    onInteractionStart={onInteractionStart}
                    onInteractionEnd={onInteractionEnd}
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Toolbar (popup menus are rendered as a floating overlay above this
          container so they don't get clipped by the horizontal ScrollView). */}
      <View style={styles.toolbarWrap}>
        {/* ── Floating popup overlay (shape / sticker / draw settings) ─────
            Positioned ABOVE the toolbar, OUTSIDE the ScrollView, so the
            menus are fully visible and not clipped by overflow.            */}
        {(showShapeMenu || showStickerPicker || showDrawSettings) && (
          <>
            {/* Tap-outside catcher to close any open popup */}
            <TouchableOpacity
              style={styles.popupBackdrop}
              activeOpacity={1}
              onPress={closeAllMenus}
            />

            {showShapeMenu && (
              <View style={[styles.floatingPopMenu, { backgroundColor: t.card, borderColor: t.border, left: 12 }]}>
                <Text style={[styles.popMenuHeader, { color: t.textSecondary }]}>Add Shape</Text>
                <View style={styles.popMenuRow}>
                  <TouchableOpacity style={[styles.popMenuChip, { borderColor: t.border }]} onPress={() => addShape('rectangle')}>
                    <Square size={18} color={t.textPrimary} />
                    <Text style={[styles.popMenuChipText, { color: t.textPrimary }]}>Rectangle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.popMenuChip, { borderColor: t.border }]} onPress={() => addShape('circle')}>
                    <CircleIcon size={18} color={t.textPrimary} />
                    <Text style={[styles.popMenuChipText, { color: t.textPrimary }]}>Circle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.popMenuChip, { borderColor: t.border }]} onPress={() => addShape('triangle')}>
                    <Triangle size={18} color={t.textPrimary} />
                    <Text style={[styles.popMenuChipText, { color: t.textPrimary }]}>Triangle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.popMenuChip, { borderColor: t.border }]} onPress={() => addShape('line')}>
                    <Minus size={18} color={t.textPrimary} />
                    <Text style={[styles.popMenuChipText, { color: t.textPrimary }]}>Line</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {showStickerPicker && (
              <View style={[styles.floatingPopMenu, { backgroundColor: t.card, borderColor: t.border, left: 12, right: 12 }]}>
                <Text style={[styles.popMenuHeader, { color: t.textSecondary }]}>Stickers</Text>
                <ScrollView
                  horizontal={false}
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 180 }}
                  contentContainerStyle={styles.stickerGridFloat}
                >
                  {STICKER_LIST.map((em) => (
                    <TouchableOpacity key={em} style={styles.stickerItemFloat} onPress={() => addSticker(em)}>
                      <Text style={styles.stickerEmoji}>{em}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {showDrawSettings && (
              <View style={[styles.floatingPopMenu, { backgroundColor: t.card, borderColor: t.border, left: 12 }]}>
                <Text style={[styles.popMenuHeader, { color: t.textSecondary }]}>Brush Size</Text>
                <View style={styles.drawWidthRow}>
                  {DRAW_WIDTHS.map((w) => (
                    <TouchableOpacity
                      key={w}
                      style={[styles.drawWidthBtn, drawWidth === w && { borderColor: accentColor, backgroundColor: accentColor + '20' }, { borderColor: t.border }]}
                      onPress={() => setDrawWidth(w)}
                    >
                      <View style={{ width: w * 2.5, height: w * 2.5, borderRadius: w * 1.25, backgroundColor: drawColor }} />
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.popMenuChip, { borderColor: t.border, alignSelf: 'flex-start', marginTop: 4 }]}
                  onPress={() => { setColorPickerTarget('draw'); setShowDrawSettings(false); }}
                >
                  <View style={[styles.colorDot, { backgroundColor: drawColor }]} />
                  <Text style={[styles.popMenuChipText, { color: t.textPrimary }]}>Color</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.toolbar, { backgroundColor: t.card, borderTopColor: t.divider }]}
          style={{ borderTopWidth: 1, borderTopColor: t.divider }}
        >
          <ToolBtn icon={<Type size={16} color={t.textPrimary} />} label="Text" color={t.textSecondary} onPress={addText} />
          <ToolBtn icon={<ImageIcon size={16} color={t.textPrimary} />} label="Image" color={t.textSecondary} onPress={addImage} />

          <ToolBtn
            icon={<Square size={16} color={showShapeMenu ? accentColor : t.textPrimary} />}
            label="Shape"
            color={showShapeMenu ? accentColor : t.textSecondary}
            onPress={() => { setShowShapeMenu(!showShapeMenu); setShowStickerPicker(false); setShowDrawSettings(false); }}
          />
          <ToolBtn
            icon={<Sticker size={16} color={showStickerPicker ? accentColor : t.textPrimary} />}
            label="Sticker"
            color={showStickerPicker ? accentColor : t.textSecondary}
            onPress={() => { setShowStickerPicker(!showStickerPicker); setShowShapeMenu(false); setShowDrawSettings(false); }}
          />
          <ToolBtn
            icon={<Pen size={16} color={drawMode || showDrawSettings ? accentColor : t.textPrimary} />}
            label="Draw"
            color={drawMode || showDrawSettings ? accentColor : t.textSecondary}
            onPress={() => { const next = !drawMode; setDrawMode(next); setSelectedId(null); setShowDrawSettings(next); setShowShapeMenu(false); setShowStickerPicker(false); }}
          />

          <View style={[styles.toolDivider, { backgroundColor: t.divider }]} />

          {/* ── Print Area editor toggle (lets the user resize the print boundary) ── */}
          <ToolBtn
            icon={<Maximize2 size={16} color={editingPrintArea ? accentColor : t.textPrimary} />}
            label={editingPrintArea ? 'Done' : 'Area'}
            color={editingPrintArea ? accentColor : t.textSecondary}
            onPress={() => {
              const next = !editingPrintArea;
              setEditingPrintArea(next);
              if (next) {
                setSelectedId(null);
                setDrawMode(false);
                setShowShapeMenu(false);
                setShowStickerPicker(false);
                setShowDrawSettings(false);
              }
            }}
          />
          {(userPrintArea || editingPrintArea) && (
            <ToolBtn
              icon={<RefreshCw size={16} color={t.textPrimary} />}
              label="Reset"
              color={t.textSecondary}
              onPress={resetPrintArea}
            />
          )}

          <View style={[styles.toolDivider, { backgroundColor: t.divider }]} />

          <ToolBtn icon={<Undo2 size={16} color={historyIdx > 0 ? t.textPrimary : t.placeholder} />} label="Undo" color={historyIdx > 0 ? t.textSecondary : t.placeholder} onPress={undo} disabled={historyIdx <= 0} />
          <ToolBtn icon={<Redo2 size={16} color={historyIdx < history.length - 1 ? t.textPrimary : t.placeholder} />} label="Redo" color={historyIdx < history.length - 1 ? t.textSecondary : t.placeholder} onPress={redo} disabled={historyIdx >= history.length - 1} />

          {selectedId && (
            <>
              <View style={[styles.toolDivider, { backgroundColor: t.divider }]} />
              <ToolBtn icon={<Copy size={16} color={t.textPrimary} />} label="Copy" color={t.textSecondary} onPress={duplicateSelected} />
              <ToolBtn icon={<Trash2 size={16} color="#EF4444" />} label="Delete" color="#EF4444" onPress={deleteSelected} />
            </>
          )}
        </ScrollView>
      </View>

      {/* Properties Panel */}
      {selected && (
        <View style={[styles.propsPanel, { backgroundColor: t.card, borderTopColor: t.divider }]}>
          {selected.type === 'text' && (
            <TextProps element={selected} t={t} accentColor={accentColor}
              onUpdate={(c) => updateProp(selected.id, c)}
              onEditText={() => { setEditText(selected.text || ''); setTextEditModal(true); }}
              onPickColor={() => setColorPickerTarget('font')}
            />
          )}
          {selected.type === 'shape' && (
            <ShapeProps element={selected} t={t}
              onUpdate={(c) => updateProp(selected.id, c)}
              onPickFill={() => setColorPickerTarget('fill')}
              onPickStroke={() => setColorPickerTarget('stroke')}
            />
          )}
          {selected.type === 'image' && (
            <View style={styles.propRow}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <Text style={[styles.propLabel, { color: t.textSecondary, marginRight: 4 }]}>Auto-fit:</Text>
                <TouchableOpacity
                  style={[styles.fitBtn, { borderColor: selected.imageFit === 'contain' ? accentColor : t.border, backgroundColor: selected.imageFit === 'contain' ? accentColor + '18' : 'transparent' }]}
                  onPress={() => applyImageFit('contain')}
                >
                  <Minimize2 size={14} color={selected.imageFit === 'contain' ? accentColor : t.textPrimary} />
                  <Text style={[styles.fitBtnText, { color: selected.imageFit === 'contain' ? accentColor : t.textPrimary }]}>Fit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.fitBtn, { borderColor: selected.imageFit === 'cover' ? accentColor : t.border, backgroundColor: selected.imageFit === 'cover' ? accentColor + '18' : 'transparent' }]}
                  onPress={() => applyImageFit('cover')}
                >
                  <Maximize2 size={14} color={selected.imageFit === 'cover' ? accentColor : t.textPrimary} />
                  <Text style={[styles.fitBtnText, { color: selected.imageFit === 'cover' ? accentColor : t.textPrimary }]}>Fill</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.fitBtn, { borderColor: selected.imageFit === 'stretch' ? accentColor : t.border, backgroundColor: selected.imageFit === 'stretch' ? accentColor + '18' : 'transparent' }]}
                  onPress={() => applyImageFit('stretch')}
                >
                  <Move size={14} color={selected.imageFit === 'stretch' ? accentColor : t.textPrimary} />
                  <Text style={[styles.fitBtnText, { color: selected.imageFit === 'stretch' ? accentColor : t.textPrimary }]}>Stretch</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.propLabel, { color: t.textSecondary, fontSize: 10, marginTop: 6 }]}>
                Drag image to move · pinch corner to resize
              </Text>
            </View>
          )}
          {selected.type === 'sticker' && (
            <View style={styles.propRow}>
              <Text style={[styles.propLabel, { color: t.textSecondary }]}>Drag to move · corner to resize</Text>
            </View>
          )}

          {/* Common: Rotation + Opacity + Size + Layers */}
          <TransformControls element={selected} t={t} accentColor={accentColor} onUpdate={(c) => updateProp(selected.id, c)} />
        </View>
      )}

      {/* Text Edit Modal */}
      <Modal visible={textEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: t.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: t.textPrimary }]}>Edit Text</Text>
              <TouchableOpacity onPress={() => setTextEditModal(false)}><X size={22} color={t.iconDefault} /></TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalInput, { color: t.textPrimary, borderColor: t.border, backgroundColor: t.inputBg || t.background }]}
              value={editText} onChangeText={setEditText} placeholder="Type something..." placeholderTextColor={t.placeholder} multiline autoFocus
            />
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: accentColor }]} onPress={() => { if (selectedId) updateProp(selectedId, { text: editText || 'Text' }); setTextEditModal(false); }}>
              <Text style={styles.modalBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Color Picker Modal */}
      <Modal visible={colorPickerTarget !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: t.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: t.textPrimary }]}>Pick Color</Text>
              <TouchableOpacity onPress={() => setColorPickerTarget(null)}><X size={22} color={t.iconDefault} /></TouchableOpacity>
            </View>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map((c, i) => (
                <TouchableOpacity
                  key={`${c}-${i}`}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c === 'transparent' ? '#FFF' : c, borderColor: c === '#FFFFFF' || c === 'transparent' ? '#D0D0D0' : c },
                    c === 'transparent' && styles.transparentSwatch,
                  ]}
                  onPress={() => {
                    if (colorPickerTarget === 'draw') {
                      setDrawColor(c === 'transparent' ? '#000' : c);
                    } else if (selectedId && colorPickerTarget) {
                      const propKey = colorPickerTarget === 'font' ? 'fontColor' : colorPickerTarget === 'fill' ? 'fillColor' : 'strokeColor';
                      updateProp(selectedId, { [propKey]: c });
                    }
                    setColorPickerTarget(null);
                  }}
                >
                  {c === 'transparent' && <View style={styles.transparentLine} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

// ─── Draggable Element ───────────────────────────────

interface ResolvedPrintZone {
  x: number; y: number; w: number; h: number;
  cx: number; cy: number;
  wrap: 'flat' | 'cylindrical' | 'fabric' | 'curved';
  curvature: number;
}

// ─── Print Area Handles ─────────────────────────────────
// Renders 4 corner handles + 4 edge handles around the print zone outline
// so the user can resize the print boundary exactly like printshoppy lets
// you change the printable area on a product. All math is in 0-1 space so
// the override travels with `userPrintArea` and stays consistent if the
// canvas size ever changes.
interface PrintAreaHandlesProps {
  printZone: {
    x: number; y: number; w: number; h: number;
  };
  /** Fitted product image rect — drag deltas normalize by this width/height. */
  imageRect: { w: number; h: number };
  /** Current print bounds as 0–1 fractions of `imageRect`. */
  norm: { left: number; top: number; right: number; bottom: number };
  accentColor: string;
  onChange: (next: { left: number; top: number; right: number; bottom: number }) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

function PrintAreaHandles({ printZone, imageRect, norm, accentColor, onChange, onInteractionStart, onInteractionEnd }: PrintAreaHandlesProps) {
  const startNormRef = useRef(norm);

  const makeResponder = (corner: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'r' | 'b' | 'l') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startNormRef.current = { ...norm };
        onInteractionStart?.();
      },
      onPanResponderMove: (_, g) => {
        const dxN = imageRect.w > 0 ? g.dx / imageRect.w : 0;
        const dyN = imageRect.h > 0 ? g.dy / imageRect.h : 0;
        const MIN = 0.05; // never collapse below 5% of the printable image box
        let { left, top, right, bottom } = startNormRef.current;

        if (corner.includes('l')) left = clamp(left + dxN, 0, right - MIN);
        if (corner.includes('r')) right = clamp(right + dxN, left + MIN, 1);
        if (corner.includes('t')) top = clamp(top + dyN, 0, bottom - MIN);
        if (corner.includes('b')) bottom = clamp(bottom + dyN, top + MIN, 1);

        onChange({ left, top, right, bottom });
      },
      onPanResponderRelease: () => onInteractionEnd?.(),
      onPanResponderTerminate: () => onInteractionEnd?.(),
    });

  const HANDLE = 22; // hit area
  const DOT = 12;    // visual dot

  const Handle = ({ left, top, corner, cursor = 'corner' }: { left: number; top: number; corner: any; cursor?: 'corner' | 'h' | 'v' }) => (
    <View
      {...makeResponder(corner).panHandlers}
      style={{
        position: 'absolute',
        left: left - HANDLE / 2,
        top: top - HANDLE / 2,
        width: HANDLE,
        height: HANDLE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: cursor === 'h' ? 6 : cursor === 'v' ? DOT : DOT,
          height: cursor === 'v' ? 6 : cursor === 'h' ? DOT : DOT,
          borderRadius: cursor === 'corner' ? DOT / 2 : 2,
          backgroundColor: '#FFF',
          borderWidth: 2,
          borderColor: accentColor,
        }}
      />
    </View>
  );

  return (
    <>
      {/* Corners */}
      <Handle left={printZone.x}                top={printZone.y}                corner="tl" />
      <Handle left={printZone.x + printZone.w}  top={printZone.y}                corner="tr" />
      <Handle left={printZone.x}                top={printZone.y + printZone.h}  corner="bl" />
      <Handle left={printZone.x + printZone.w}  top={printZone.y + printZone.h}  corner="br" />
      {/* Edge midpoints */}
      <Handle left={printZone.x + printZone.w / 2} top={printZone.y}                  corner="t" cursor="h" />
      <Handle left={printZone.x + printZone.w / 2} top={printZone.y + printZone.h}    corner="b" cursor="h" />
      <Handle left={printZone.x}                   top={printZone.y + printZone.h / 2} corner="l" cursor="v" />
      <Handle left={printZone.x + printZone.w}     top={printZone.y + printZone.h / 2} corner="r" cursor="v" />
    </>
  );
}

interface DragProps {
  element: CanvasElement;
  isSelected: boolean;
  canvasWidth: number;
  canvasHeight: number;
  accentColor: string;
  printZone: ResolvedPrintZone;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onCommitMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  onCommitResize: (id: string, w: number, h: number) => void;
  onDoubleTap: () => void;
  disabled?: boolean;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

function DraggableItem({ element, isSelected, canvasWidth, canvasHeight, accentColor, printZone, onSelect, onMove, onCommitMove, onResize, onCommitResize, onDoubleTap, disabled, onInteractionStart, onInteractionEnd }: DragProps) {
  const lastTap = useRef(0);
  const startPos = useRef({ x: element.x, y: element.y });
  const startSize = useRef({ w: element.width, h: element.height });

  useEffect(() => {
    startPos.current = { x: element.x, y: element.y };
    startSize.current = { w: element.width, h: element.height };
  }, [element.x, element.y, element.width, element.height]);

  const dragResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: (_, g) => !disabled && (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2),
    onPanResponderGrant: () => {
      onInteractionStart?.();
      const now = Date.now();
      if (now - lastTap.current < 300) onDoubleTap();
      lastTap.current = now;
      onSelect(element.id);
      startPos.current = { x: element.x, y: element.y };
    },
    onPanResponderMove: (_, g) => {
      onMove(element.id, clamp(startPos.current.x + g.dx, -element.width * 0.5, canvasWidth - element.width * 0.5), clamp(startPos.current.y + g.dy, -element.height * 0.5, canvasHeight - element.height * 0.5));
    },
    onPanResponderRelease: (_, g) => {
      onInteractionEnd?.();
      onCommitMove(element.id, clamp(startPos.current.x + g.dx, -element.width * 0.5, canvasWidth - element.width * 0.5), clamp(startPos.current.y + g.dy, -element.height * 0.5, canvasHeight - element.height * 0.5));
    },
  }), [element.id, element.x, element.y, element.width, element.height, canvasWidth, canvasHeight, disabled, onInteractionStart, onInteractionEnd]);

  const resizeResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { onInteractionStart?.(); startSize.current = { w: element.width, h: element.height }; },
    onPanResponderMove: (_, g) => { onResize(element.id, Math.max(24, startSize.current.w + g.dx), Math.max(24, startSize.current.h + g.dy)); },
    onPanResponderRelease: (_, g) => { onInteractionEnd?.(); onCommitResize(element.id, Math.max(24, startSize.current.w + g.dx), Math.max(24, startSize.current.h + g.dy)); },
  }), [element.id, element.width, element.height, onInteractionStart, onInteractionEnd]);

  // ─── Per-element surface wrap (real per-strip-style mockup) ─────────────
  // Each design element gets a 3D rotation based on where it sits on the
  // print zone — designs near the centre stay flat, designs near the edges
  // tilt away from the camera (just like a label wrapping a real mug).
  const wrapTransforms = useMemo(() => {
    if (printZone.wrap === 'flat' || printZone.wrap === 'fabric') return [];
    const elementCenterX = element.x + element.width / 2;
    const elementCenterY = element.y + element.height / 2;
    const halfW = printZone.w / 2;
    const halfH = printZone.h / 2;
    if (halfW <= 0 || halfH <= 0) return [];

    if (printZone.wrap === 'cylindrical') {
      const relX = clamp((elementCenterX - printZone.cx) / halfW, -1, 1);
      const intensity = printZone.curvature || 0.8;
      const angleDeg = relX * 55 * intensity;            // up to ±55°
      const cos = Math.cos((relX * Math.PI) / 2 * intensity);
      const scaleX = 0.55 + 0.45 * cos;                  // 0.55 → 1.0
      return [
        { perspective: 700 } as any,
        { rotateY: `${angleDeg}deg` } as any,
        { scaleX } as any,
      ];
    }

    if (printZone.wrap === 'curved') {
      const relY = clamp((elementCenterY - printZone.cy) / halfH, -1, 1);
      const intensity = printZone.curvature || 0.5;
      const angleDeg = relY * 28 * intensity;
      const cos = Math.cos((relY * Math.PI) / 2 * intensity);
      const scaleY = 0.75 + 0.25 * cos;
      return [
        { perspective: 900 } as any,
        { rotateX: `${-angleDeg}deg` } as any,
        { scaleY } as any,
      ];
    }
    return [];
  }, [printZone.wrap, printZone.curvature, printZone.cx, printZone.cy, printZone.w, printZone.h, element.x, element.y, element.width, element.height]);

  // While selected we drop the wrap so the user can edit / drag without the 3D
  // tilt fighting their gestures. The wrap re-applies the moment they tap away.
  const composedTransforms = useMemo(() => {
    const userRotate: any = { rotate: `${element.rotation}deg` };
    if (isSelected || wrapTransforms.length === 0) return [userRotate];
    return [...wrapTransforms, userRotate];
  }, [wrapTransforms, isSelected, element.rotation]);

  return (
    <View
      style={[
        styles.elemWrap,
        {
          left: element.x, top: element.y, width: element.width, height: element.height,
          zIndex: element.zIndex, opacity: element.opacity,
          transform: composedTransforms,
        },
        isSelected && { borderWidth: 1.5, borderColor: accentColor, borderStyle: 'dashed' },
      ]}
      {...dragResponder.panHandlers}
    >
      <ElementContent element={element} />

      {isSelected && (
        <>
          <View style={[styles.resizeHandle, { backgroundColor: accentColor }]} {...resizeResponder.panHandlers} />
          <View style={[styles.cornerHandle, styles.cornerTL, { borderColor: accentColor }]} />
          <View style={[styles.cornerHandle, styles.cornerTR, { borderColor: accentColor }]} />
          <View style={[styles.cornerHandle, styles.cornerBL, { borderColor: accentColor }]} />
        </>
      )}
    </View>
  );
}

// ─── Element Content Renderer ────────────────────────

function ElementContent({ element }: { element: CanvasElement }) {
  if (element.type === 'text') {
    return (
      <Text
        style={{ fontSize: element.fontSize ?? 18, color: element.fontColor ?? '#000', fontWeight: element.fontBold ? 'bold' : 'normal', fontStyle: element.fontItalic ? 'italic' : 'normal', textAlign: element.textAlign ?? 'center', textAlignVertical: 'center', flex: 1 }}
        numberOfLines={0}
      >{element.text}</Text>
    );
  }
  if (element.type === 'image' && element.imageUri) {
    return (
      <Image
        source={{ uri: element.imageUri }}
        style={{ width: '100%', height: '100%', borderRadius: element.borderRadius ?? 0 }}
        resizeMode={element.imageFit ?? 'contain'}
      />
    );
  }
  if (element.type === 'sticker') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: Math.min(element.width, element.height) * 0.7 }}>{element.emoji}</Text>
      </View>
    );
  }
  if (element.type === 'shape') {
    if (element.shapeType === 'triangle') {
      return (
        <Svg width={element.width - 4} height={element.height - 4} viewBox={`0 0 ${element.width} ${element.height}`}>
          <Path
            d={`M${element.width / 2},4 L${element.width - 4},${element.height - 4} L4,${element.height - 4} Z`}
            fill={element.fillColor ?? 'transparent'}
            stroke={element.strokeColor ?? '#000'}
            strokeWidth={element.strokeWidth ?? 2}
          />
        </Svg>
      );
    }
    return (
      <View style={{
        flex: 1, backgroundColor: element.fillColor ?? 'transparent',
        borderWidth: element.strokeWidth ?? 1, borderColor: element.strokeColor ?? '#000',
        borderRadius: element.shapeType === 'circle' ? 9999 : (element.borderRadius ?? 0),
      }} />
    );
  }
  return null;
}

// ─── Sub Components ──────────────────────────────────

function ToolBtn({ icon, label, color, onPress, disabled }: { icon: React.ReactNode; label: string; color: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity style={styles.toolBtn} onPress={onPress} disabled={disabled} activeOpacity={0.7}>
      {icon}
      <Text style={[styles.toolLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function TextProps({ element, t, accentColor, onUpdate, onEditText, onPickColor }: { element: CanvasElement; t: any; accentColor: string; onUpdate: (c: Partial<CanvasElement>) => void; onEditText: () => void; onPickColor: () => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.propInner}>
      <PropChip t={t} onPress={onEditText}><Type size={14} color={t.textPrimary} /><Text style={[styles.propChipText, { color: t.textPrimary }]}>Edit</Text></PropChip>
      <PropChip t={t} onPress={() => onUpdate({ fontSize: Math.max(8, (element.fontSize ?? 18) - 2) })}><Minus size={14} color={t.textPrimary} /><Text style={[styles.propChipText, { color: t.textPrimary }]}>{element.fontSize}</Text></PropChip>
      <PropChip t={t} onPress={() => onUpdate({ fontSize: Math.min(120, (element.fontSize ?? 18) + 2) })}><Plus size={14} color={t.textPrimary} /></PropChip>
      <PropChip t={t} active={element.fontBold} accent={accentColor} onPress={() => onUpdate({ fontBold: !element.fontBold })}><Bold size={14} color={element.fontBold ? accentColor : t.textPrimary} /></PropChip>
      <PropChip t={t} active={element.fontItalic} accent={accentColor} onPress={() => onUpdate({ fontItalic: !element.fontItalic })}><Italic size={14} color={element.fontItalic ? accentColor : t.textPrimary} /></PropChip>
      <PropChip t={t} active={element.textAlign === 'left'} accent={accentColor} onPress={() => onUpdate({ textAlign: 'left' })}><AlignLeft size={14} color={element.textAlign === 'left' ? accentColor : t.textPrimary} /></PropChip>
      <PropChip t={t} active={element.textAlign === 'center'} accent={accentColor} onPress={() => onUpdate({ textAlign: 'center' })}><AlignCenter size={14} color={element.textAlign === 'center' ? accentColor : t.textPrimary} /></PropChip>
      <PropChip t={t} active={element.textAlign === 'right'} accent={accentColor} onPress={() => onUpdate({ textAlign: 'right' })}><AlignRight size={14} color={element.textAlign === 'right' ? accentColor : t.textPrimary} /></PropChip>
      <PropChip t={t} onPress={onPickColor}><View style={[styles.colorDot, { backgroundColor: element.fontColor ?? '#000' }]} /><Text style={[styles.propChipText, { color: t.textPrimary }]}>Color</Text></PropChip>
    </ScrollView>
  );
}

function ShapeProps({ element, t, onUpdate, onPickFill, onPickStroke }: { element: CanvasElement; t: any; onUpdate: (c: Partial<CanvasElement>) => void; onPickFill: () => void; onPickStroke: () => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.propInner}>
      <PropChip t={t} onPress={onPickFill}><View style={[styles.colorDot, { backgroundColor: element.fillColor ?? 'transparent' }]} /><Text style={[styles.propChipText, { color: t.textPrimary }]}>Fill</Text></PropChip>
      <PropChip t={t} onPress={onPickStroke}><View style={[styles.colorDot, { backgroundColor: element.strokeColor ?? '#000' }]} /><Text style={[styles.propChipText, { color: t.textPrimary }]}>Stroke</Text></PropChip>
      <PropChip t={t} onPress={() => onUpdate({ strokeWidth: Math.max(0, (element.strokeWidth ?? 2) - 1) })}><Minus size={14} color={t.textPrimary} /><Text style={[styles.propChipText, { color: t.textPrimary }]}>{element.strokeWidth ?? 2}px</Text></PropChip>
      <PropChip t={t} onPress={() => onUpdate({ strokeWidth: Math.min(20, (element.strokeWidth ?? 2) + 1) })}><Plus size={14} color={t.textPrimary} /></PropChip>
      <PropChip t={t} onPress={() => onUpdate({ borderRadius: Math.min(50, (element.borderRadius ?? 0) + 4) })}><Text style={[styles.propChipText, { color: t.textPrimary }]}>R: {element.borderRadius ?? 0}</Text></PropChip>
    </ScrollView>
  );
}

function TransformControls({ element, t, accentColor, onUpdate }: { element: CanvasElement; t: any; accentColor: string; onUpdate: (c: Partial<CanvasElement>) => void }) {
  return (
    <View style={styles.transformRow}>
      <View style={styles.transformGroup}>
        <RotateCw size={12} color={t.textSecondary} />
        <TouchableOpacity style={[styles.miniBtn, { borderColor: t.border }]} onPress={() => onUpdate({ rotation: element.rotation - 15 })}>
          <Text style={[styles.miniBtnText, { color: t.textPrimary }]}>-15°</Text>
        </TouchableOpacity>
        <Text style={[styles.propLabel, { color: t.textSecondary }]}>{element.rotation}°</Text>
        <TouchableOpacity style={[styles.miniBtn, { borderColor: t.border }]} onPress={() => onUpdate({ rotation: element.rotation + 15 })}>
          <Text style={[styles.miniBtnText, { color: t.textPrimary }]}>+15°</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.transformGroup}>
        {element.opacity < 1 ? <EyeOff size={12} color={t.textSecondary} /> : <Eye size={12} color={t.textSecondary} />}
        <TouchableOpacity style={[styles.miniBtn, { borderColor: t.border }]} onPress={() => onUpdate({ opacity: Math.max(0.1, +(element.opacity - 0.1).toFixed(1)) })}>
          <Minus size={10} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.propLabel, { color: t.textSecondary }]}>{Math.round(element.opacity * 100)}%</Text>
        <TouchableOpacity style={[styles.miniBtn, { borderColor: t.border }]} onPress={() => onUpdate({ opacity: Math.min(1, +(element.opacity + 0.1).toFixed(1)) })}>
          <Plus size={10} color={t.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.transformGroup}>
        <Layers size={12} color={t.textSecondary} />
        <TouchableOpacity style={[styles.miniBtn, { borderColor: t.border }]} onPress={() => onUpdate({ zIndex: Math.max(1, element.zIndex - 1) })}>
          <Text style={[styles.miniBtnText, { color: t.textPrimary }]}>↓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.miniBtn, { borderColor: t.border }]} onPress={() => onUpdate({ zIndex: element.zIndex + 1 })}>
          <Text style={[styles.miniBtnText, { color: t.textPrimary }]}>↑</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.propLabel, { color: t.placeholder }]}>{Math.round(element.width)}×{Math.round(element.height)}</Text>
    </View>
  );
}

function PropChip({ t, children, onPress, active, accent }: { t: any; children: React.ReactNode; onPress: () => void; active?: boolean; accent?: string }) {
  return (
    <TouchableOpacity
      style={[styles.propChip, { borderColor: active && accent ? accent : t.border }, active && accent ? { backgroundColor: accent + '30' } : undefined]}
      onPress={onPress} activeOpacity={0.7}
    >{children}</TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
  zoomBar: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 8,
    borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 6,
  },
  zoomBtn: { padding: 4 },
  zoomLabel: { fontFamily: 'Poppins_500Medium', fontSize: 12, minWidth: 40, textAlign: 'center' },
  drawIndicator: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, marginLeft: 4 },
  canvasOuter: { alignItems: 'center', paddingVertical: 8 },
  canvas: { borderRadius: 16, overflow: 'hidden', position: 'relative', alignSelf: 'center' },
  elemWrap: { position: 'absolute', padding: 2 },
  resizeHandle: {
    position: 'absolute', bottom: -7, right: -7, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#FFF',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 }, android: { elevation: 3 } }),
  },
  cornerHandle: { position: 'absolute', width: 8, height: 8, borderRadius: 4, borderWidth: 2, backgroundColor: '#FFF' },
  cornerTL: { top: -5, left: -5 },
  cornerTR: { top: -5, right: -5 },
  cornerBL: { bottom: -5, left: -5 },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, gap: 2 },
  toolBtn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 4, minWidth: 44 },
  toolLabel: { fontFamily: 'Poppins_500Medium', fontSize: 9, marginTop: 1 },
  toolDivider: { width: 1, height: 28, marginHorizontal: 4 },
  popMenu: {
    position: 'absolute', bottom: '100%', left: -10, borderRadius: 12, borderWidth: 1, paddingVertical: 4, minWidth: 140, zIndex: 999,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 }, android: { elevation: 8 } }),
  },
  popMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  popMenuText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', minWidth: 220, paddingHorizontal: 6, paddingVertical: 8 },
  stickerItem: { width: '12.5%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  stickerEmoji: { fontSize: 22 },

  // Floating popup overlay (above the toolbar, outside the ScrollView so it never gets clipped)
  toolbarWrap: { position: 'relative' },
  popupBackdrop: {
    position: 'absolute', bottom: '100%', left: 0, right: 0, height: 9999,
    backgroundColor: 'transparent', zIndex: 998,
  },
  floatingPopMenu: {
    position: 'absolute', bottom: '100%', marginBottom: 8,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10,
    maxWidth: '92%', zIndex: 1000,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10 },
      android: { elevation: 12 },
    }),
  },
  popMenuHeader: {
    fontFamily: 'Poppins_500Medium', fontSize: 11, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  popMenuRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  popMenuChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  popMenuChipText: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  stickerGridFloat: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 4 },
  stickerItemFloat: {
    width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  drawWidthRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  drawWidthBtn: { borderWidth: 1, borderRadius: 8, padding: 6, alignItems: 'center', justifyContent: 'center', minWidth: 36, minHeight: 36 },
  propsPanel: { borderTopWidth: 1, paddingVertical: 6, paddingHorizontal: 6 },
  propInner: { gap: 6, alignItems: 'center', paddingHorizontal: 4 },
  propRow: { paddingHorizontal: 8, paddingVertical: 4 },
  propChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  propChipText: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
  propLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
  fitBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  fitBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  colorDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#D0D0D0' },
  transformRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingTop: 6, flexWrap: 'wrap', gap: 6 },
  transformGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  miniBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontFamily: 'Poppins_400Regular', fontSize: 16, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  modalBtn: { borderRadius: 10, height: 48, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#FFFFFF' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 8 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2 },
  transparentSwatch: { borderStyle: 'dashed' },
  transparentLine: { width: 28, height: 2, backgroundColor: '#EF4444', transform: [{ rotate: '45deg' }] },
});
