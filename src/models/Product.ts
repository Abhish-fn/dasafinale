import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface INutritionInfo {
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
  fiber?: string;
}

export interface IVariant {
  _id: Types.ObjectId;
  packagingSize: string;
  weight: number;
  price: number;
  compareAtPrice?: number;
  stock: number;
  salesCount: number;
}

export interface IProduct extends Document {
  productId: string;
  title: string;
  slug: string;
  description: string;
  images: string[];
  category: string;
  tags: string[];
  variants: Types.DocumentArray<IVariant>;
  isActive: boolean;
  isMustTry: boolean;
  isSpecialItem: boolean;
  isBestSeller: boolean;
  hsnCode: string;
  nutritionInfo?: INutritionInfo;
  createdAt: Date;
  updatedAt: Date;
}

const CATEGORIES = [
  'Clay Pot Roasted Seeds & Superfoods',
  'Protein & Energy Snacks',
  'Palm Jaggery Millet Biscuits',
  'Traditional Millet Savoury Snacks',
  'Healthy Chips & Crisps',
  'Premium Healthy Sweets',
] as const;

const nutritionInfoSchema = new Schema(
  {
    calories: String,
    protein: String,
    carbs: String,
    fat: String,
    fiber: String,
  },
  { _id: false }
);

const variantSchema = new Schema<IVariant>(
  {
    packagingSize: { type: String, required: true },
    weight: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    salesCount: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const productSchema = new Schema<IProduct>(
  {
    productId: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    images: { type: [String], default: [], validate: [(v: string[]) => v.length <= 5, 'Max 5 images'] },
    category: { type: String, required: true, enum: CATEGORIES },
    tags: { type: [String], default: [] },
    variants: {
      type: [variantSchema],
      required: true,
      validate: [(v: IVariant[]) => v.length >= 1, 'At least one variant required'],
    },
    isActive: { type: Boolean, default: true },
    isMustTry: { type: Boolean, default: false },
    isSpecialItem: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    hsnCode: { type: String, default: '' },
    nutritionInfo: { type: nutritionInfoSchema },
  },
  { timestamps: true }
);

productSchema.index({ category: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ 'variants.price': 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ title: 'text', description: 'text', tags: 'text' });

const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', productSchema);
export default Product;
