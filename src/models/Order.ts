import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IProductSnapshot {
  title: string;
  image: string;
  price: number;
  packagingSize: string;
  productId: string;
}

export interface IOrderItem {
  productId: Types.ObjectId;
  productSnapshot: IProductSnapshot;
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

export interface ITrackingEntry {
  status: string;
  timestamp: Date;
  note?: string;
  location?: string;
}

export interface IOrder extends Document {
  orderId: string;
  userId: Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  pricing: {
    subtotal: number;
    discount: number;
    shippingFee: number;
    total: number;
  };
  coupon?: {
    code: string;
    discountType: 'percentage' | 'flat';
    discountValue: number;
  };
  payment: {
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded' | 'expired';
    failureReason?: string;
    method?: string;
    paidAt?: Date;
  };
  paymentProcessed: boolean;
  status: 'placed' | 'confirmed' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
  tracking: {
    carrier?: string;
    trackingId?: string;
    trackingUrl?: string;
    estimatedDelivery?: Date;
    statusHistory: ITrackingEntry[];
  };
  isBuyNow: boolean;
  expiresAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSnapshotSchema = new Schema<IProductSnapshot>(
  {
    title: { type: String, required: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true },
    packagingSize: { type: String, required: true },
    productId: { type: String, required: true },
  },
  { _id: false }
);

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productSnapshot: { type: productSnapshotSchema, required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceAtOrder: { type: Number, required: true },
  },
  { _id: false }
);

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false }
);

const trackingEntrySchema = new Schema<ITrackingEntry>(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    note: String,
    location: String,
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], required: true },
    shippingAddress: { type: shippingAddressSchema, required: true },
    pricing: {
      subtotal: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      shippingFee: { type: Number, required: true },
      total: { type: Number, required: true },
    },
    coupon: {
      code: String,
      discountType: { type: String, enum: ['percentage', 'flat'] },
      discountValue: Number,
    },
    payment: {
      razorpayOrderId: { type: String, required: true },
      razorpayPaymentId: String,
      razorpaySignature: String,
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded', 'expired'],
        default: 'pending',
      },
      failureReason: String,
      method: String,
      paidAt: Date,
    },
    paymentProcessed: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'placed',
    },
    tracking: {
      carrier: String,
      trackingId: String,
      trackingUrl: String,
      estimatedDelivery: Date,
      statusHistory: { type: [trackingEntrySchema], default: [] },
    },
    isBuyNow: { type: Boolean, default: false },
    expiresAt: Date,
    notes: String,
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ expiresAt: 1, 'payment.status': 1 });

const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema);
export default Order;
