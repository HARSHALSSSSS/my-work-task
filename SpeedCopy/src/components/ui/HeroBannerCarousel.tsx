import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

export type HeroBannerSlide = {
  id: string;
  image: ImageSourcePropType;
  overlay?: React.ReactNode;
};

type HeroBannerCarouselProps = {
  slides: HeroBannerSlide[];
  height: number;
  style?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
  autoSlideMs?: number;
  sidePeek?: number;
  gap?: number;
};

export function HeroBannerCarousel({
  slides,
  height,
  style,
  cardStyle,
  autoSlideMs = 4000,
  sidePeek = 0,
  gap = 0,
}: HeroBannerCarouselProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const normalizedSlides = useMemo(() => slides.filter(Boolean), [slides]);
  const effectivePeek = normalizedSlides.length > 1 ? sidePeek : 0;
  const effectiveGap = normalizedSlides.length > 1 ? gap : 0;
  const slideWidth = Math.max(containerWidth - effectivePeek, 0);
  const snapInterval = slideWidth + effectiveGap;

  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth && nextWidth !== containerWidth) {
      setContainerWidth(nextWidth);
    }
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!snapInterval) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / snapInterval);
    setActiveIndex(Math.max(0, Math.min(nextIndex, normalizedSlides.length - 1)));
  };

  useEffect(() => {
    if (activeIndex >= normalizedSlides.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, normalizedSlides.length]);

  useEffect(() => {
    if (normalizedSlides.length <= 1 || !snapInterval) return undefined;

    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % normalizedSlides.length;
        scrollRef.current?.scrollTo({ x: next * snapInterval, animated: true });
        return next;
      });
    }, autoSlideMs);

    return () => clearInterval(timer);
  }, [autoSlideMs, normalizedSlides.length, snapInterval]);

  return (
    <View style={style} onLayout={onLayout}>
      {containerWidth > 0 ? (
        <>
          <ScrollView
            ref={scrollRef}
            horizontal
            decelerationRate="fast"
            snapToInterval={snapInterval || undefined}
            snapToAlignment="start"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            scrollEventThrottle={16}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingRight: effectivePeek },
            ]}
          >
            {normalizedSlides.map((slide, index) => (
              <View
                key={slide.id}
                style={[
                  styles.slideCard,
                  {
                    width: slideWidth || containerWidth,
                    height,
                    marginRight: index === normalizedSlides.length - 1 ? 0 : effectiveGap,
                  },
                  cardStyle,
                ]}
              >
                <Image source={slide.image} style={styles.slideImage} resizeMode="cover" />
                {slide.overlay ? <View style={styles.overlayLayer}>{slide.overlay}</View> : null}
              </View>
            ))}
          </ScrollView>
          {normalizedSlides.length > 1 ? (
            <View style={styles.dotsRow}>
              {normalizedSlides.map((slide, index) => (
                <View
                  key={`${slide.id}-dot`}
                  style={[
                    styles.dot,
                    index === activeIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: 'stretch',
  },
  slideCard: {
    overflow: 'hidden',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotActive: {
    backgroundColor: '#111827',
  },
  dotInactive: {
    backgroundColor: '#D1D5DB',
  },
});
