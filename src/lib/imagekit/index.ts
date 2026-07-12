/**
 * src/lib/imagekit/index.ts
 *
 * Client-safe exports (URL building, presets, validation, types) are
 * safe to import anywhere. Server-only exports (upload, delete,
 * client) are re-exported too, but any file importing them inherits
 * their server-only guard — importing this barrel from browser code
 * only throws if a server-only export is actually invoked, exactly
 * like the individual files' own behavior.
 */
export { buildImageKitUrl, buildImageKitSrcSet } from './imagekit.url';
export { IMAGE_PRESETS, buildPresetUrl } from './imagekit.transform';
export type { ImagePresetName } from './imagekit.transform';
export { validateImageFile, uploadImageSchema, imageTransformationSchema } from './imagekit.validation';
export { ImageKitError, mapImageKitError } from './imagekit.errors';
export type { ImageKitErrorCode } from './imagekit.errors';
export type {
  ImageKitUploadResult,
  UploadImageInput,
  ImageTransformation,
  ImageFormat,
  ImageCropMode,
  ImageFocus,
  AllowedImageMimeType,
} from './imagekit.types';
export { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from './imagekit.types';

export { getImageKitClient } from './imagekit.client.server';
export { uploadImage } from './imagekit.upload.server';
export { deleteImage, deleteImages } from './imagekit.delete.server';
