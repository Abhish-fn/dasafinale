import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICouponUsage extends Document {
  couponId: Types.ObjectId;
  userId: Types.ObjectId;
  orderId: Types.ObjectId;
  status: 'reserved' | 'used' | 'released';
  usedAt?: Date;
  createdAt: Date;
}

const couponUsageSchema = new Schema<ICouponUsage>(
  {
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    status: { type: String, enum: ['reserved', 'used', 'released'], default: 'reserved' },
    usedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index for per-user limit check
couponUsageSchema.index({ couponId: 1, userId: 1 });
// For cleanup on order expiry
couponUsageSchema.index({ orderId: 1 });

const CouponUsage: Model<ICouponUsage> =
  mongoose.models.CouponUsage || mongoose.model<ICouponUsage>('CouponUsage', couponUsageSchema);
export default CouponUsage;
