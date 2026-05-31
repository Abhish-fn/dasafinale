import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INutritionInfo {
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
  fiber?: string;
}

export interface IProduct extends Document {
  productId: string;
  title: string;
  slug: string;
  description: string;
  images: string[];
  price: number;
  compareAtPrice?: number;
  category: string;
  foodType: string;
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

const FOOD_TYPES = ['Seeds', 'Superfood', 'Biscuits', 'Snacks', 'Chips', 'Sweets', 'Protein'] as const;

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

const productSchema = new Schema<IProduct>(
  {
    productId: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, required: true },
    images: { type: [String], default: [], validate: [(v: string[]) => v.length <= 5, 'Max 5 images'] },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    category: { type: String, required: true, enum: CATEGORIES },
    foodType: { type: String, required: true, enum: FOOD_TYPES },
    tags: { type: [String], default: [] },
    packagingSize: { type: String, required: true },
    parentProduct: { type: String },
    variantGroup: { type: String },
    stock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    isMustTry: { type: Boolean, default: false },
    isSpecialItem: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    salesCount: { type: Number, default: 0, min: 0 },
    weight: { type: Number, required: true, min: 0 },
    nutritionInfo: { type: nutritionInfoSchema },
  },
  { timestamps: true }
);

productSchema.index({ category: 1 });
productSchema.index({ foodType: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ price: 1 });
productSchema.index({ variantGroup: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ title: 'text', description: 'text', tags: 'text' });

const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', productSchema);
export default Product;
