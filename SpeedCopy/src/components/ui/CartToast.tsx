import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CheckCircle2, X } from 'lucide-react-native';
import { useThemeStore } from '../../store/useThemeStore';

interface CartToastProps {
  visible: boolean;
  productName: string;
  onDismiss: () => void;
  onViewCart?: () => void;
}

export function CartToast({ visible, productName, onDismiss, onViewCart }: CartToastProps) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const { colors: t } = useThemeStore();

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, [onDismiss, opacity, translateY]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(hide, 2800);
      return () => clearTimeout(timer);
    }
  }, [visible, hide, opacity, translateY]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }], opacity, backgroundColor: t.card },
        Platform.select({
          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
          android: { elevation: 8 },
        }),
      ]}
    >
      <View style={styles.iconWrap}>
        <CheckCircle2 size={22} color="#00A63E" fill="#E8F8EE" />
      </View>

      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: t.textPrimary }]} numberOfLines={1}>
          Added to Cart
        </Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]} numberOfLines={1}>
          {productName}
        </Text>
      </View>

      {onViewCart && (
        <TouchableOpacity style={styles.viewBtn} onPress={onViewCart} activeOpacity={0.8}>
          <Text style={styles.viewBtnText}>View Cart</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={hide} hitSlop={10} style={styles.closeBtn}>
        <X size={16} color={t.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 13,
    paddingLeft: 14,
    paddingRight: 12,
    gap: 12,
    zIndex: 9999,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  viewBtn: {
    backgroundColor: '#0F766E',
    borderRadius: 10,
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  viewBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
});
