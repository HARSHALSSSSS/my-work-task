import { Platform, Share } from 'react-native';
import { formatCurrency } from './formatCurrency';

type ProductFlow = 'gifting' | 'printing' | 'shopping';

export type ShareProductInput = {
  productId: string;
  productName: string;
  flowType: ProductFlow;
  price?: number;
  imageUrl?: string;
};

export function buildProductDeepLink({ flowType, productId }: Pick<ShareProductInput, 'flowType' | 'productId'>): string {
  const safeFlow = encodeURIComponent(flowType || 'shopping');
  const safeId = encodeURIComponent(productId || '');
  return `speedcopy://product/${safeFlow}/${safeId}`;
}

export async function shareProduct(input: ShareProductInput) {
  const deepLink = buildProductDeepLink(input);
  const safeName = String(input.productName || 'Product').trim() || 'Product';
  const priceLine = typeof input.price === 'number' && Number.isFinite(input.price)
    ? `Price: ${formatCurrency(input.price)}`
    : '';
  const imageLine = input.imageUrl ? `Image: ${input.imageUrl}` : '';

  const lines = [
    safeName,
    priceLine,
    `Open in SpeedCopy: ${deepLink}`,
    imageLine,
  ].filter(Boolean);

  const message = lines.join('\n');

  await Share.share(
    Platform.select({
      ios: {
        title: safeName,
        message,
        url: deepLink,
      },
      default: {
        title: safeName,
        message,
      },
    }) as any,
  );
}
