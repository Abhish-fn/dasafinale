import { z } from 'zod';

// --- Product ---
export const productSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(10).max(5000),
  price: z.number().int().positive(),
  compareAtPrice: z.number().int().positive().optional(),
  category: z.enum([
    'Clay Pot Roasted Seeds & Superfoods',
    'Protein & Energy Snacks',
    'Palm Jaggery Millet Biscuits',
    'Traditional Millet Savoury Snacks',
    'Healthy Chips & Crisps',
    'Premium Healthy Sweets',
  ]),
  foodType: z.enum(['Seeds', 'Superfood', 'Biscuits', 'Snacks', 'Chips', 'Sweets', 'Protein']),
  tags: z.array(z.string()).max(10).default([]),
  packagingSize: z.string().min(1).max(20),
  parentProduct: z.string().optional(),
  variantGroup: z.string().optional(),
  stock: z.number().int().min(0).default(0),
  weight: z.number().positive(),
  images: z.array(z.string().url()).max(5).default([]),
  isMustTry: z.boolean().default(false),
  isSpecialItem: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  nutritionInfo: z
    .object({
      calories: z.string().optional(),
      protein: z.string().optional(),
      carbs: z.string().optional(),
      fat: z.string().optional(),
      fiber: z.string().optional(),
    })
    .optional(),
});

export const productUpdateSchema = productSchema.partial();

// --- Cart ---
export const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
  sessionId: z.string().optional(),
});

export const cartUpdateSchema = z.object({
  quantity: z.number().int().min(1).max(50),
});

// --- Address ---
export const addressSchema = z.object({
  label: z.string().min(1).max(50).default('Home'),
  fullName: z.string().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  addressLine1: z.string().min(5).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  isDefault: z.boolean().default(false),
});

// --- Coupon ---
export const couponSchema = z.object({
  code: z.string().min(3).max(20).transform((v) => v.toUpperCase()),
  description: z.string().max(200).optional(),
  discountType: z.enum(['percentage', 'flat']),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().int().min(0).default(0),
  maxDiscountAmount: z.number().int().positive().optional(),
  usageLimit: z.number().int().positive().default(100),
  perUserLimit: z.number().int().positive().default(1),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

// --- Coupon Validate ---
export const couponValidateSchema = z.object({
  code: z.string().min(1),
  cartTotal: z.number().int().positive(),
});

// --- Order Update (Admin) ---
export const orderUpdateSchema = z.object({
  status: z
    .enum(['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'])
    .optional(),
  tracking: z
    .object({
      carrier: z.string().optional(),
      trackingId: z.string().optional(),
      trackingUrl: z.string().url().optional(),
      estimatedDelivery: z.string().datetime().optional(),
    })
    .optional(),
  statusNote: z.string().max(500).optional(),
});

// --- Admin Password (for product deletion) ---
export const adminPasswordSchema = z.object({
  adminPassword: z.string().min(1),
});

// --- Checkout ---
export const createOrderSchema = z.object({
  addressId: z.string().min(1),
  couponCode: z.string().optional(),
  notes: z.string().max(500).optional(),
  isBuyNow: z.boolean().default(false),
  buyNowItem: z
    .object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1),
    })
    .optional(),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
