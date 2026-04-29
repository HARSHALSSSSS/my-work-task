import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  Group,
  Image as SkiaImage,
  Path as SkiaPath,
  Rect,
  RoundedRect,
  Skia,
  rect,
  rrect,
  useCanvasRef,
  useImage,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

export interface PrintAreaSpec {
  left: number;
  top: number;
  right: number;
  bottom: number;
  label?: string;
}

export type ProductMaskKind =
  | 'rect'
  | 'roundedRect'
  | 'circle'
  | 'barrel'
  | 'svg';

export interface ProductMaskSpec {
  kind: ProductMaskKind;
  cornerRadius?: number;
  curvature?: number;
  /** Barrel top control point factor (relative to bow). */
  topCurve?: number;
  /** Barrel bottom control point factor (relative to bow). */
  bottomCurve?: number;
  /** Barrel edge inset factor (relative to bow). */
  edgeInset?: number;
  svgPath?: string;
}

export interface ProductCanvasConfig {
  printArea: PrintAreaSpec;
  mask: ProductMaskSpec;
  overlay?: {
    uri?: string | null;
    opacity?: number;
  };
}

interface Props {
  productImageUri?: string;
  userImageUri?: string | null;
  productNaturalSize?: { width: number; height: number } | null;
  width: number;
  height: number;
  productConfig: ProductCanvasConfig;
  backgroundColor?: string;
  accentColor?: string;
  enableRotate?: boolean;
  interactionEnabled?: boolean;
  onReset?: () => void;
}

export interface SkiaProductCanvasHandle {
  exportSnapshot: () => Promise<string | null>;
  resetTransforms: () => void;
}

function containRect(
  cw: number,
  ch: number,
  iw: number,
  ih: number,
): { x: number; y: number; w: number; h: number } {
  if (!cw || !ch || !iw || !ih) return { x: 0, y: 0, w: cw, h: ch };
  const s = Math.min(cw / iw, ch / ih);
  const w = iw * s;
  const h = ih * s;
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
}

function computeCoverFit(
  areaW: number,
  areaH: number,
  imageW: number,
  imageH: number,
): { width: number; height: number; scale: number } {
  if (!imageW || !imageH || !areaW || !areaH) {
    return { width: areaW, height: areaH, scale: 1 };
  }
  const scale = Math.max(areaW / imageW, areaH / imageH);
  return {
    width: imageW * scale,
    height: imageH * scale,
    scale,
  };
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

function buildBarrelPath(
  x: number,
  y: number,
  w: number,
  h: number,
  curve: number,
  opts?: {
    topCurve?: number;
    bottomCurve?: number;
    edgeInset?: number;
  },
) {
  const path = Skia.Path.Make();
  const curvature = clamp(curve, 0, 1);
  if (curvature <= 0.0001) {
    path.addRect(rect(x, y, w, h));
    return path;
  }

  const bow = Math.min(h * 0.18, w * 0.14) * curvature;
  const edgeInset = clamp(opts?.edgeInset ?? 1, 0.35, 1.6);
  const topCurve = clamp(opts?.topCurve ?? -0.15, -1, 2);
  const bottomCurve = clamp(opts?.bottomCurve ?? 0.15, -1, 2);
  const left = x;
  const right = x + w;
  const top = y;
  const bottom = y + h;
  const topEdge = top + bow * edgeInset;
  const bottomEdge = bottom - bow * edgeInset;

  path.moveTo(left, topEdge);
  path.cubicTo(
    left + w * 0.33, top + bow * topCurve,
    left + w * 0.67, top + bow * topCurve,
    right, topEdge,
  );
  path.lineTo(right, bottomEdge);
  path.cubicTo(
    left + w * 0.67, bottom + bow * bottomCurve,
    left + w * 0.33, bottom + bow * bottomCurve,
    left, bottomEdge,
  );
  path.close();
  return path;
}

function buildSvgPath(svgPath?: string) {
  if (!svgPath) return null;
  try {
    return Skia.Path.MakeFromSVGString(svgPath);
  } catch {
    return null;
  }
}

function clampWorklet(v: number, lo: number, hi: number) {
  'worklet';
  return Math.max(lo, Math.min(hi, v));
}

export const SkiaProductCanvas = forwardRef<SkiaProductCanvasHandle, Props>(
  function SkiaProductCanvas(
    {
      productImageUri,
      userImageUri,
      productNaturalSize,
      width,
      height,
      productConfig,
      backgroundColor = '#F4F4F4',
      accentColor = '#0F766E',
      enableRotate = false,
      interactionEnabled = true,
      onReset,
    },
    ref,
  ) {
    const canvasRef = useCanvasRef();

    const productImage = useImage(productImageUri ?? null);
    const overlayImage = useImage(productConfig.overlay?.uri ?? null);
    const userImage = useImage(userImageUri ?? null);

    const fitted = useMemo(() => {
      if (productNaturalSize?.width && productNaturalSize?.height) {
        return containRect(
          width,
          height,
          productNaturalSize.width,
          productNaturalSize.height,
        );
      }
      return { x: 0, y: 0, w: width, h: height };
    }, [height, productNaturalSize, width]);

    const printRect = useMemo(() => {
      const area = productConfig.printArea;
      const left = clamp(area.left, 0, 1);
      const top = clamp(area.top, 0, 1);
      const right = clamp(area.right, left + 0.01, 1);
      const bottom = clamp(area.bottom, top + 0.01, 1);
      return {
        x: fitted.x + left * fitted.w,
        y: fitted.y + top * fitted.h,
        w: (right - left) * fitted.w,
        h: (bottom - top) * fitted.h,
      };
    }, [fitted, productConfig.printArea]);

    const circleBounds = useMemo(() => {
      const side = Math.min(printRect.w, printRect.h);
      return {
        x: printRect.x + (printRect.w - side) / 2,
        y: printRect.y + (printRect.h - side) / 2,
        w: side,
        h: side,
      };
    }, [printRect.h, printRect.w, printRect.x, printRect.y]);

    // For circular products, use the inscribed square as the interaction box
    // so cover-fit + drag clamps match the real printed circle perfectly.
    const interactionRect = useMemo(
      () => (productConfig.mask.kind === 'circle' ? circleBounds : printRect),
      [productConfig.mask.kind, circleBounds, printRect],
    );

    const centerX = interactionRect.x + interactionRect.w / 2;
    const centerY = interactionRect.y + interactionRect.h / 2;

    const userBase = useMemo(() => {
      if (!userImage) {
        return { width: 0, height: 0, scale: 1 };
      }
      return computeCoverFit(
        interactionRect.w,
        interactionRect.h,
        userImage.width(),
        userImage.height(),
      );
    }, [interactionRect.h, interactionRect.w, userImage]);

    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTX = useSharedValue(0);
    const savedTY = useSharedValue(0);
    const rotation = useSharedValue(0);
    const savedRotation = useSharedValue(0);

    const clampTranslation = useCallback(
      (nextTX: number, nextTY: number, nextScale: number) => {
        'worklet';
        const scaledW = userBase.width * nextScale;
        const scaledH = userBase.height * nextScale;
        const maxX = Math.max(0, (scaledW - interactionRect.w) / 2);
        const maxY = Math.max(0, (scaledH - interactionRect.h) / 2);
        return {
          x: clampWorklet(nextTX, -maxX, maxX),
          y: clampWorklet(nextTY, -maxY, maxY),
        };
      },
      [interactionRect.h, interactionRect.w, userBase.height, userBase.width],
    );

    const resetTransforms = useCallback(() => {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTX.value = 0;
      savedTY.value = 0;
      rotation.value = 0;
      savedRotation.value = 0;
      onReset?.();
    }, [
      onReset,
      rotation,
      savedRotation,
      savedScale,
      savedTX,
      savedTY,
      scale,
      translateX,
      translateY,
    ]);

    useEffect(() => {
      resetTransforms();
    }, [resetTransforms, userImageUri, productConfig.printArea, productConfig.mask]);

    const gesturesEnabled = interactionEnabled && !!userImage;

    const pinch = useMemo(
      () =>
        Gesture.Pinch()
          .enabled(gesturesEnabled)
          .onUpdate((e) => {
            'worklet';
            const nextScale = clampWorklet(savedScale.value * e.scale, 1, 6);
            const nextPos = clampTranslation(
              savedTX.value,
              savedTY.value,
              nextScale,
            );
            scale.value = nextScale;
            translateX.value = nextPos.x;
            translateY.value = nextPos.y;
          })
          .onEnd(() => {
            'worklet';
            savedScale.value = scale.value;
            savedTX.value = translateX.value;
            savedTY.value = translateY.value;
          }),
      [clampTranslation, gesturesEnabled, savedScale, savedTX, savedTY, scale, translateX, translateY],
    );

    const pan = useMemo(
      () =>
        Gesture.Pan()
          .enabled(gesturesEnabled)
          .averageTouches(true)
          .onUpdate((e) => {
            'worklet';
            const next = clampTranslation(
              savedTX.value + e.translationX,
              savedTY.value + e.translationY,
              scale.value,
            );
            translateX.value = next.x;
            translateY.value = next.y;
          })
          .onEnd(() => {
            'worklet';
            savedTX.value = translateX.value;
            savedTY.value = translateY.value;
          }),
      [clampTranslation, gesturesEnabled, savedTX, savedTY, scale, translateX, translateY],
    );

    const rotate = useMemo(
      () =>
        Gesture.Rotation()
          .enabled(enableRotate && gesturesEnabled)
          .onUpdate((e) => {
            'worklet';
            rotation.value = savedRotation.value + e.rotation;
          })
          .onEnd(() => {
            'worklet';
            savedRotation.value = rotation.value;
          }),
      [enableRotate, gesturesEnabled, rotation, savedRotation],
    );

    const doubleTap = useMemo(
      () =>
        Gesture.Tap()
          .enabled(gesturesEnabled)
          .numberOfTaps(2)
          .onEnd(() => {
            'worklet';
            scale.value = 1;
            savedScale.value = 1;
            translateX.value = 0;
            translateY.value = 0;
            savedTX.value = 0;
            savedTY.value = 0;
            rotation.value = 0;
            savedRotation.value = 0;
          }),
      [
        rotation,
        savedRotation,
        savedScale,
        savedTX,
        savedTY,
        scale,
        translateX,
        translateY,
        gesturesEnabled,
      ],
    );

    const composed = useMemo(
      () => Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan, rotate)),
      [doubleTap, pan, pinch, rotate],
    );

    const skTransform = useDerivedValue(() => [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { translateX: centerX },
      { translateY: centerY },
      { rotate: rotation.value },
      { scale: scale.value },
      { translateX: -centerX },
      { translateY: -centerY },
    ]);

    const maskPath = useMemo(() => {
      const mask = productConfig.mask;
      if (mask.kind === 'barrel') {
        return buildBarrelPath(
          printRect.x,
          printRect.y,
          printRect.w,
          printRect.h,
          mask.curvature ?? 0.8,
          {
            topCurve: mask.topCurve,
            bottomCurve: mask.bottomCurve,
            edgeInset: mask.edgeInset,
          },
        );
      }
      if (mask.kind === 'svg') {
        return buildSvgPath(mask.svgPath);
      }
      return null;
    }, [printRect.h, printRect.w, printRect.x, printRect.y, productConfig.mask]);

    const maskRRect = useMemo(() => {
      const mask = productConfig.mask;
      if (mask.kind === 'circle') {
        return rrect(
          rect(circleBounds.x, circleBounds.y, circleBounds.w, circleBounds.h),
          circleBounds.w / 2,
          circleBounds.w / 2,
        );
      }
      const radius = mask.kind === 'roundedRect'
        ? clamp(mask.cornerRadius ?? 10, 0, Math.min(printRect.w, printRect.h) / 2)
        : 0;
      return rrect(
        rect(printRect.x, printRect.y, printRect.w, printRect.h),
        radius,
        radius,
      );
    }, [circleBounds.h, circleBounds.w, circleBounds.x, circleBounds.y, printRect.h, printRect.w, printRect.x, printRect.y, productConfig.mask]);

    const clip = maskPath ?? maskRRect;
    const overlayOpacity = clamp(productConfig.overlay?.opacity ?? 1, 0, 1);
    const productLoading = !!productImageUri && !productImage;

    useImperativeHandle(
      ref,
      () => ({
        exportSnapshot: async () => {
          if (!canvasRef.current) return null;
          try {
            const snap = canvasRef.current.makeImageSnapshot();
            if (!snap) return null;
            return `data:image/png;base64,${snap.encodeToBase64()}`;
          } catch {
            return null;
          }
        },
        resetTransforms,
      }),
      [canvasRef, resetTransforms],
    );

    const canvasNode = (
      <Animated.View style={StyleSheet.absoluteFill}>
        <Canvas ref={canvasRef} style={{ width, height }}>
              {/* Layer 1 — Product mockup base. */}
              {productImage && (
                <SkiaImage
                  image={productImage}
                  x={fitted.x}
                  y={fitted.y}
                  width={fitted.w}
                  height={fitted.h}
                  fit="contain"
                />
              )}

              {/* Layer 2 — User image on top of product, clipped strictly
                  to printable shape/area so it never spills outside marks.
                  This keeps preview visible even when source mockup assets
                  are fully opaque (most current app images). */}
              {userImage && (
                <Group clip={clip}>
                  <Group transform={skTransform}>
                    <SkiaImage
                      image={userImage}
                      x={centerX - userBase.width / 2}
                      y={centerY - userBase.height / 2}
                      width={userBase.width}
                      height={userBase.height}
                      fit="cover"
                    />
                  </Group>
                </Group>
              )}

              {/* Layer 3 — Optional overlay (gloss/shadow/frame details). */}
              {overlayImage && (
                <SkiaImage
                  image={overlayImage}
                  x={fitted.x}
                  y={fitted.y}
                  width={fitted.w}
                  height={fitted.h}
                  fit="contain"
                  opacity={overlayOpacity}
                />
              )}

              {/* Print-zone outline — only when the user has not uploaded
                  any image yet. Painted last so the hint stays visible
                  above the mockup. */}
              {!userImage && (
                <>
                  {productConfig.mask.kind === 'circle' ? (
                    <RoundedRect
                      x={circleBounds.x}
                      y={circleBounds.y}
                      width={circleBounds.w}
                      height={circleBounds.h}
                      r={circleBounds.w / 2}
                      style="stroke"
                      strokeWidth={1.5}
                      color={`${accentColor}AA`}
                    />
                  ) : maskPath ? (
                    <SkiaPath
                      path={maskPath}
                      style="stroke"
                      strokeWidth={1.5}
                      color={`${accentColor}AA`}
                    />
                  ) : productConfig.mask.kind === 'roundedRect' ? (
                    <RoundedRect
                      x={printRect.x}
                      y={printRect.y}
                      width={printRect.w}
                      height={printRect.h}
                      r={clamp(productConfig.mask.cornerRadius ?? 10, 0, Math.min(printRect.w, printRect.h) / 2)}
                      style="stroke"
                      strokeWidth={1.5}
                      color={`${accentColor}AA`}
                    />
                  ) : (
                    <Rect
                      x={printRect.x}
                      y={printRect.y}
                      width={printRect.w}
                      height={printRect.h}
                      style="stroke"
                      strokeWidth={1.5}
                      color={`${accentColor}AA`}
                    />
                  )}
                </>
              )}
        </Canvas>
      </Animated.View>
    );

    return (
      <View style={[styles.wrap, { width, height, backgroundColor }]}>
        {interactionEnabled ? (
          <GestureDetector gesture={composed}>{canvasNode}</GestureDetector>
        ) : (
          canvasNode
        )}

        {productLoading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={accentColor} />
          </View>
        )}

        {productImage && !userImage && (
          <View style={styles.emptyHintWrap} pointerEvents="none">
            <Text style={styles.emptyHint}>
              Upload photo: it will auto-cover the {productConfig.printArea.label?.toLowerCase() ?? 'print area'}
            </Text>
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHintWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: 'center',
  },
  emptyHint: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#666',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
