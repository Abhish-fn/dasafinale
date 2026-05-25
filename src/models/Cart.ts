import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICartItem {
  productId: Types.ObjectId;
  quantity: number;
  addedAt: Date;
}

export interface ICart extends Document {
  userId: Types.ObjectId | null;
  sessionId: string | null;
  items: ICartItem[];
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const cartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    sessionId: { type: String, default: null },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

// Sparse unique indexes — only one cart per user OR per session
cartSchema.index({ userId: 1 }, { unique: true, sparse: true });
cartSchema.index({ sessionId: 1 }, { unique: true, sparse: true });

const Cart: Model<ICart> = mongoose.models.Cart || mongoose.model<ICart>('Cart', cartSchema);
export default Cart;
