export interface CloudinaryImageData {
  id?: number;
  product_id?: number;
  cloudinary_public_id: string;
  url: string;
  secure_url: string;
  thumbnail_url?: string;
  filename?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  format?: string;
  size_bytes?: number;
  is_primary: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}