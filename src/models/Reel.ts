import mongoose, { Schema, Document } from 'mongoose';

export interface IReel extends Document {
  cloudinaryId: string;
  title: string;
  tag: string;
  instagramUrl: string;
  shopUrl?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReelSchema = new Schema<IReel>(
  {
    cloudinaryId: { type: String, required: true },
    title: { type: String, required: true },
    tag: { type: String, default: 'LIVE COMMERCE' },
    instagramUrl: { type: String, required: true },
    shopUrl: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Reel || mongoose.model<IReel>('Reel', ReelSchema);
