export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discountLabel?: string;
  image: string;
  category: string;
  rating?: number;
  inStock: boolean;
}

export interface CartItem {
  id: string;
  backendProductId?: string;
  designId?: string;
  printConfigId?: string;
  businessPrintConfigId?: string;
  businessConfigDraft?: {
    quantity?: number;
    deliveryMethod?: 'pickup' | 'delivery';
    shopId?: string;
    servicePackage?: 'standard' | 'express' | 'instant' | '';
    designType?: 'premium' | 'normal';
    selectedOptions?: {
      size?: string;
      paperType?: string;
      finish?: string;
      sides?: string;
    };
  };
  product?: Product;
  printConfig?: PrintConfig;
  type: 'product' | 'printing' | 'gifting';
  flowType?: 'printing' | 'gifting' | 'shopping';
  quantity: number;
  price: number;
  name: string;
  image?: string;
}

export interface PrintConfig {
  serviceType: 'standard' | 'spiral' | 'soft' | 'thesis';
  deliveryMethod?: 'pickup' | 'delivery';
  shopId?: string;
  servicePackage?: 'standard' | 'express' | 'instant';
  colorMode: 'bw' | 'color' | 'custom';
  pageSize: 'A4' | 'A3';
  printSide: 'one-sided' | 'two-sided' | '4-in-1';
  printType: 'loose' | 'stapled';
  copies: number;
  coverColor?: 'blue' | 'green' | 'pink';
  addons: {
    linearGraph: number;
    semiLogGraph: number;
  };
  specialInstructions: string;
  fileUri?: string;
  fileName?: string;
  fileMime?: string;
  uploadedFile?: {
    _id?: string;
    url: string;
    name: string;
    mimeType?: string;
    size?: number;
    pageCount?: number;
    previewImage?: string;
    thumbnailUrl?: string;
    previewUrl?: string;
  };
  coverPage?: string;
  bindingCover?: string;
  cdOption?: string;
  thesisSpineText?: string;
  customColorDescription?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: 'placed' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: CartItem[];
  total: number;
  date: string;
  address: Address;
  trackingSteps: TrackingStep[];
}

export interface TrackingStep {
  title: string;
  subtitle: string;
  time: string;
  completed: boolean;
  active: boolean;
}

export interface Address {
  id: string;
  label?: 'Home' | 'Office' | 'Other';
  name: string;
  phone: string;
  houseNo?: string;
  area?: string;
  landmark?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  location?: { lat: number; lng: number };
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'order' | 'promo' | 'wallet' | 'general';
}

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved';
  date: string;
  orderId?: string;
}

export type ServiceCategory = 'printing' | 'gifting' | 'shopping';

export type PrintingSubService = 'standard' | 'spiral' | 'soft' | 'thesis';
