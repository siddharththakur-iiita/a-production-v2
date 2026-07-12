/**
 * src/lib/imagekit/imagekit.types.ts
 */

export interface ImageKitUploadResult {
  fileId: string;
  filePath: string;
  url: string;
  thumbnailUrl: string;
  size: number;
  width: number | null;
  height: number | null;
}

export interface UploadImageInput {
  /** Raw file bytes/buffer, or a base64 data URI, or a remote URL for ImageKit to fetch — matches the ImageKit Upload API's own accepted input shapes. */
  file: Buffer | string;
  /** The desired filename (ImageKit auto-appends a unique suffix on conflict unless useUniqueFileName is false). */
  fileName: string;
  /** ImageKit folder path, e.g. "/products/{productId}" — mirrors the folder-per-entity convention already used for Supabase Storage (015_storage.sql). */
  folder?: string;
  tags?: string[];
  /** If true (default), ImageKit appends a random suffix to avoid overwriting an existing file of the same name. */
  useUniqueFileName?: boolean;
}

export type ImageFormat = 'auto' | 'webp' | 'jpg' | 'png' | 'avif';
export type ImageCropMode = 'maintain_ratio' | 'force' | 'at_least' | 'at_max';
export type ImageFocus = 'auto' | 'center' | 'top' | 'left' | 'bottom' | 'right' | 'face';

export interface ImageTransformation {
  width?: number;
  height?: number;
  quality?: number;
  format?: ImageFormat;
  crop?: ImageCropMode;
  focus?: ImageFocus;
  blur?: number;
  rotate?: number;
}

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
