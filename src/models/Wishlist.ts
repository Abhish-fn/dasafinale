import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IWishlistProduct {
  productId: Types.ObjectId;
  addedAt: Date;
}

export interface IWishlist extends Document {
  userId: Types.ObjectId;
  products: IWishlistProduct[];
  updatedAt: Date;
}

const wishlistProductSchema = new Schema<IWishlistProduct>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const wishlistSchema = new Schema<IWishlist>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    products: { type: [wishlistProductSchema], default: [] },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

wishlistSchema.index({ userId: 1 }, { unique: true });

const Wishlist: Model<IWishlist> = mongoose.models.Wishlist || mongoose.model<IWishlist>('Wishlist', wishlistSchema);
export default Wishlist;
