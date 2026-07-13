export type Review = {
  id?: number;
  orderItemId: number;
  productId?: number | null;
  productName?: string;
  comboId?: number | null;
  comboName?: string;
  itemType?: "PRODUCT" | "COMBO";
  rating: number; // 1-5 stars
  content: string;
  imageUrls?: string[]; // Review images
  userName?: string;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
};
