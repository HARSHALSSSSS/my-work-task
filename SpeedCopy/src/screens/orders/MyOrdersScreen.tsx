import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, Gift, Printer, BookOpen, Package, ShoppingBag } from 'lucide-react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { useThemeStore } from '../../store/useThemeStore';
import { useOrderStore } from '../../store/useOrderStore';
import { OrdersStackParamList } from '../../navigation/types';
import { resolveProductImageSource } from '../../utils/product';
import { formatCurrency } from '../../utils/formatCurrency';
import * as ordersApi from '../../api/orders';
import * as productsApi from '../../api/products';

type Nav = NativeStackNavigationProp<OrdersStackParamList, 'MyOrders'>;
type Category = 'gifting' | 'printing' | 'stationery' | 'shopping';
type Status = 'Delivered' | 'In Transit' | 'Cancelled';

interface DisplayOrder {
  id: string;
  orderId: string;
  name: string;
  details: string;
  amount: number;
  status: Status;
  category: Category;
  initials: string;
  image?: string;
  imageCandidates: string[];
  imageKey: string;
}

type ImageOverride = {
  imageUri: string;
  imageCandidates: string[];
  imageKey: string;
};

const FALLBACK_IMAGE_BY_CATEGORY: Record<Category, string> = {
  gifting: Image.resolveAssetSource(require('../../../assets/images/gift-prod-mug.png'))?.uri || '',
  printing: Image.resolveAssetSource(require('../../../assets/images/print-business-cards.png'))?.uri || '',
  stationery: Image.resolveAssetSource(require('../../../assets/images/shop-notebooks.png'))?.uri || '',
  shopping: Image.resolveAssetSource(require('../../../assets/images/shop-notebooks.png'))?.uri || '',
};

function getOrderImageSources(order: any, override?: ImageOverride) {
  const items: any[] = Array.isArray(order?.items) ? order.items : [];
  const firstItem: any = items[0] || {};

  return [
    override,
    firstItem,
    firstItem?.product,
    firstItem?.variantSnapshot,
    firstItem?.variant_snapshot,
    firstItem?.productSnapshot,
    firstItem?.product_snapshot,
    firstItem?.snapshot,
    ...items,
    ...items.map((item) => item?.product),
    ...items.map((item) => item?.variantSnapshot),
    ...items.map((item) => item?.variant_snapshot),
    ...items.map((item) => item?.productSnapshot),
    ...items.map((item) => item?.product_snapshot),
    ...items.map((item) => item?.snapshot),
    order,
  ];
}

function OrderImage({
  image,
  imageCandidates,
  imageKey,
  backgroundColor,
  fallback: FallbackIcon,
  fallbackColor,
}: {
  image?: string;
  imageCandidates: string[];
  imageKey: string;
  backgroundColor: string;
  fallback: React.ElementType;
  fallbackColor: string;
}) {
  const candidates = React.useMemo(
    () => (imageCandidates.length ? imageCandidates : resolveProductImageSource({ image }).imageCandidates),
    [image, imageCandidates],
  );
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [imageKey]);

  const activeUri = candidates[imageIndex];

  return (
    <View style={[styles.productImg, { backgroundColor }]}>
      {activeUri ? (
        <Image
          source={{ uri: activeUri }}
          style={styles.productImageActual}
          resizeMode="cover"
          onError={() => setImageIndex((prev) => (prev + 1 < candidates.length ? prev + 1 : candidates.length))}
        />
      ) : (
        <FallbackIcon size={30} color={fallbackColor} />
      )}
    </View>
  );
}

const CAT_CFG: Record<Category, { label: string; icon: React.ElementType; bg: string; stroke: string }> = {
  gifting: { label: 'Gifting', icon: Gift, bg: 'rgba(155, 81, 224, 0.2)', stroke: '#9B51E0' },
  printing: { label: 'Printing', icon: Printer, bg: 'rgba(0, 94, 255, 0.2)', stroke: '#005EFF' },
  stationery: { label: 'Stationery', icon: BookOpen, bg: 'rgba(255, 119, 0, 0.2)', stroke: '#FF7700' },
  shopping: { label: 'Shopping', icon: ShoppingBag, bg: 'rgba(255, 119, 0, 0.2)', stroke: '#FF7700' },
};

const STATUS_CFG: Record<Status, { bg: string; color: string }> = {
  Delivered: { bg: 'rgba(39, 174, 96, 0.2)', color: '#27AE60' },
  'In Transit': { bg: 'rgba(242, 153, 74, 0.2)', color: '#F2994A' },
  Cancelled: { bg: 'rgba(235, 87, 87, 0.2)', color: '#EB5757' },
};

export const MyOrdersScreen: React.FC = () => {
  const { colors: t } = useThemeStore();
  const navigation = useNavigation<Nav>();
  const fetchOrders = useOrderStore((s) => s.fetchOrders);
  const storeOrders = useOrderStore((s) => s.orders);
  const [loading, setLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [imageOverrides, setImageOverrides] = useState<Record<string, ImageOverride>>({});

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchOrders().finally(() => setLoading(false));
  }, [fetchOrders]));

  useEffect(() => {
    let cancelled = false;

    const missingImageOrders = storeOrders.filter((order) => {
      if (!order?.items?.length) return false;
      const override = imageOverrides[order.id];
      const resolved = resolveProductImageSource(...getOrderImageSources(order, override));
      return !resolved.imageUri;
    });

    if (!missingImageOrders.length) return () => { cancelled = true; };

    Promise.all(
      missingImageOrders.map(async (order) => {
        const firstItem: any = order.items[0] || {};
        const fallbackProductId = String(firstItem?.backendProductId || firstItem?.productId || '').trim();

        try {
          const backendOrder = await ordersApi.getOrder(order.id).catch(() => null);
          const backendItems: any[] = Array.isArray(backendOrder?.items) ? backendOrder.items : [];
          const backendItem: any = backendItems[0] || null;

          const fromOrder = resolveProductImageSource(
            ...getOrderImageSources(backendOrder || order),
            firstItem,
            backendItem,
          );
          if (fromOrder.imageUri) {
            return { orderId: order.id, resolved: fromOrder };
          }

          const backendItemWithProduct = backendItems.find((item) => item?.productId) || backendItem;
          const flowTypeRaw = String(backendItemWithProduct?.flowType || firstItem?.flowType || '').toLowerCase();
          const flowType = flowTypeRaw === 'stationery' ? 'shopping' : flowTypeRaw;
          const productId = String(backendItemWithProduct?.productId || fallbackProductId).trim();
          if (!productId) return null;

          let productPayload: any = null;
          if (flowType === 'shopping') {
            productPayload = await productsApi.getShoppingProduct(productId).catch(() => null);
          } else if (flowType === 'gifting') {
            productPayload = await productsApi.getGiftingProduct(productId).catch(() => null);
          } else if (flowType === 'printing') {
            productPayload = await productsApi.getBusinessPrintProduct(productId).catch(() => null);
          }

          if (!productPayload) {
            productPayload = await productsApi.getProductById(productId).catch(() => null);
          }

          const resolved = resolveProductImageSource(
            productPayload,
            ...getOrderImageSources(backendOrder || order),
            backendItemWithProduct,
            firstItem,
          );
          if (!resolved.imageUri) return null;
          return { orderId: order.id, resolved };
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const nextEntries = results.filter(Boolean) as Array<{ orderId: string; resolved: ReturnType<typeof resolveProductImageSource> }>;
      if (!nextEntries.length) return;
      setImageOverrides((prev) => {
        const next = { ...prev };
        nextEntries.forEach(({ orderId, resolved }) => {
          next[orderId] = {
            imageUri: resolved.imageUri,
            imageCandidates: resolved.imageCandidates,
            imageKey: resolved.imageKey,
          };
        });
        return next;
      });
    });

    return () => { cancelled = true; };
  }, [imageOverrides, storeOrders]);

  const displayOrders: DisplayOrder[] = React.useMemo(() => storeOrders.map((o) => {
    const firstItem: any = o.items[0] || {};
    const override = imageOverrides[o.id];
    const rawCategory = String(
      firstItem?.flowType
      || (firstItem?.type === 'printing' ? 'printing' : firstItem?.type === 'gifting' ? 'gifting' : 'shopping'),
    ).toLowerCase();
    const category: Category = rawCategory === 'printing'
      ? 'printing'
      : rawCategory === 'gifting'
        ? 'gifting'
        : rawCategory === 'stationery'
          ? 'stationery'
          : 'shopping';
    const fallbackImageUri = FALLBACK_IMAGE_BY_CATEGORY[category];
    const resolvedImage = resolveProductImageSource(...getOrderImageSources(o, override));
    const imageCandidates = Array.from(new Set([
      ...resolvedImage.imageCandidates,
      fallbackImageUri,
    ].filter(Boolean)));

    return {
      id: o.id,
      orderId: o.orderNumber,
      name: firstItem?.name || 'Order',
      details: o.items.map((i) => i.name).join(', '),
      amount: o.total,
      status: o.status === 'delivered' ? 'Delivered' as Status : o.status === 'cancelled' ? 'Cancelled' as Status : 'In Transit' as Status,
      category,
      initials: (firstItem?.name || 'OR').slice(0, 2).toUpperCase(),
      image: imageCandidates[0] || undefined,
      imageCandidates,
      imageKey: imageCandidates.join('|'),
    };
  }), [imageOverrides, storeOrders]);

  const onReorder = useCallback(async (orderId: string) => {
    if (reorderingId) return;
    setReorderingId(orderId);
    try {
      const reordered = await ordersApi.reorder(orderId);
      await fetchOrders().catch(() => {});
      navigation.navigate('Tracking', { orderId: reordered?._id || orderId });
    } catch (e: any) {
      Alert.alert('Reorder Failed', e?.serverMessage || e?.message || 'Could not reorder this item right now.');
    } finally {
      setReorderingId(null);
    }
  }, [fetchOrders, navigation, reorderingId]);

  return (
    <SafeScreen>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color={t.iconDefault} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>My Orders</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={t.textPrimary} style={{ marginTop: 40 }} />
        ) : displayOrders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Package size={48} color={t.textSecondary} />
            <Text style={[styles.emptyTitle, { color: t.textPrimary }]}>No orders yet</Text>
            <Text style={[styles.emptySub, { color: t.textSecondary }]}>Your order history will appear here</Text>
          </View>
        ) : null}
        {displayOrders.map((order) => {
          const cat = CAT_CFG[order.category];
          const sCfg = STATUS_CFG[order.status];
          const CatIcon = cat.icon;
          const isReordering = reorderingId === order.id;

          return (
            <View key={order.id} style={[styles.orderCard, { backgroundColor: t.card }]}>
              <View style={styles.orderHeader}>
                <Text style={[styles.orderIdText, { color: t.textPrimary }]}>{order.orderId}</Text>
                <View style={[styles.catBadge, { backgroundColor: cat.bg, borderColor: cat.stroke }]}>
                  <CatIcon size={12} color={cat.stroke} />
                  <Text style={[styles.catText, { color: cat.stroke }]}>{cat.label}</Text>
                </View>
              </View>

              <View style={styles.orderBody}>
                <OrderImage
                  image={order.image}
                  imageCandidates={order.imageCandidates}
                  imageKey={order.imageKey}
                  backgroundColor={cat.bg}
                  fallback={CatIcon}
                  fallbackColor={cat.stroke}
                />
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: t.textPrimary }]}>{order.name}</Text>
                  <Text style={[styles.productDetails, { color: t.textSecondary }]}>{order.details}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: sCfg.bg }]}>
                    <Text style={[styles.statusText, { color: sCfg.color }]}>{order.status}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.separator, { backgroundColor: t.divider }]} />

              <View style={styles.orderFooter}>
                <View style={styles.footerLeft}>
                  <Text style={[styles.totalLabel, { color: t.textSecondary }]}>Total Amount</Text>
                  <Text style={[styles.totalAmount, { color: t.textPrimary }]}>{formatCurrency(order.amount)}</Text>
                </View>
                <View style={styles.footerBtns}>
                  <TouchableOpacity
                    style={[styles.viewOrderBtn, { borderColor: t.textPrimary }]}
                    onPress={() => navigation.navigate('Tracking', { orderId: order.id })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.viewOrderText, { color: t.textPrimary }]}>View Order</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reorderBtn, { backgroundColor: t.textPrimary }, isReordering && { opacity: 0.7 }]}
                    activeOpacity={0.8}
                    onPress={() => onReorder(order.id)}
                    disabled={isReordering}
                  >
                    <Text style={[styles.reorderText, { color: t.background }]}>
                      {isReordering ? 'Reordering...' : 'Reorder'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    lineHeight: 36,
    color: '#242424',
    textAlign: 'center',
  },
  content: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
  },
  orderCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 15,
    padding: 10,
    gap: 10,
    justifyContent: 'center',
    height: 193,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  orderIdText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 23,
    color: '#000000',
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
  },
  catText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
  },
  orderBody: {
    flexDirection: 'row',
    gap: 16,
  },
  productImg: {
    width: 90,
    height: 74,
    borderRadius: 12,
    backgroundColor: '#E8E4DE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImageActual: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 23,
    color: '#000000',
  },
  productDetails: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    lineHeight: 18,
    color: '#6B6B6B',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  statusText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
  },
  separator: {
    height: 0.5,
    backgroundColor: '#A5A5A5',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {},
  totalLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    lineHeight: 18,
    color: '#6B6B6B',
  },
  totalAmount: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: '#000000',
  },
  footerBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  viewOrderBtn: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  viewOrderText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#000000',
  },
  reorderBtn: {
    backgroundColor: '#000000',
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  reorderText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  emptyBox: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    marginTop: 8,
  },
  emptySub: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
  },
});
