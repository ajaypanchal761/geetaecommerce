import mongoose, { Schema, Document } from 'mongoose';

export interface IVideoFind extends Document {
  title: string;
  price: number;
  originalPrice: number;
  videoUrl: string;
  views: string;
  createdAt: Date;
  updatedAt: Date;
}

const VideoFindSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
    videoUrl: { type: String, required: true },
    views: { type: String, default: '0' },
  },
  { timestamps: true }
);

export default mongoose.model<IVideoFind>('VideoFind', VideoFindSchema);
