// Shared TypeScript types for the DasaDinusulu app

export type UserRole = 'user' | 'admin';

export type ProductCategory =
  | 'Clay Pot Roasted Seeds & Superfoods'
  | 'Millet Munchies'
  | 'Trail Mixes'
  | 'Healthy Cookies'
  | 'Protein Bars'
  | 'Granola';

export type FoodType = 'Seeds' | 'Millet' | 'Nuts' | 'Cookies' | 'Bars' | 'Mix';

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'expired';

export type DiscountType = 'percentage' | 'flat';

export type CouponUsageStatus = 'reserved' | 'used' | 'released';

export interface IAddress {
  _id?: string;
  userId: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface INutritionInfo {
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
  fiber?: string;
}

export interface IProduct {
  _id: string;
  productId: string;
  title: string;
  slug: string;
  description: string;
  images: string[];
  price: number;
  compareAtPrice?: number;
  category: ProductCategory;
  foodType: FoodType;
  tags: string[];
  packagingSize: string;
  parentProduct?: string;
  variantGroup?: string;
  stock: number;
  isActive: boolean;
  isMustTry: boolean;
  isSpecialItem: boolean;
  isBestSeller: boolean;
  salesCount: number;
  weight: number;
  nutritionInfo?: INutritionInfo;
  createdAt: string;
  updatedAt: string;
}

export interface ICartItem {
  productId: string;
  quantity: number;
  addedAt: string;
}

export interface IOrderItem {
  productId: string;
  productSnapshot: {
    title: string;
    image: string;
    price: number;
    packagingSize: string;
    productId: string;
  };
  quantity: number;
  priceAtOrder: number;
}

export interface IShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface IPricing {
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
}

export interface ITrackingEntry {
  status: string;
  timestamp: string;
  description: string;
  location?: string;
}

export interface ITracking {
  carrier?: string;
  trackingId?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  statusHistory: ITrackingEntry[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
