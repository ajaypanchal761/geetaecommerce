import api from '../config';

export interface VideoFind {
  _id: string;
  title: string;
  price: number;
  originalPrice: number;
  videoUrl: string;
  views: string;
}

export const getVideoFinds = async () => {
  const response = await api.get<{ success: boolean; data: VideoFind[] }>('/customer/video-finds');
  return response.data;
};
