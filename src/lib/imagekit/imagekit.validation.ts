/**
 * src/lib/imagekit/imagekit.validation.ts
 */
import { z } from 'zod';
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_BYTES } from './imagekit.types';

export const uploadImageSchema = z.object({
  fileName: z.string().min(1, 'fileName is required').max(255),
  folder: z
    .string()
    .max(500)
    .regex(/^\//, 'folder must start with /')
    .optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  useUniqueFileName: z.boolean().optional(),
});

export function validateImageFile(params: { mimeType: string; sizeBytes: number }): {
  valid: boolean;
  code?: 'invalid_file_type' | 'file_too_large';
  reason?: string;
} {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(params.mimeType as never)) {
    return {
      valid: false,
      code: 'invalid_file_type',
      reason: `Unsupported file type "${params.mimeType}". Allowed: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}.`,
    };
  }
  if (params.sizeBytes > MAX_IMAGE_UPLOAD_BYTES) {
    return {
      valid: false,
      code: 'file_too_large',
      reason: `File is ${(params.sizeBytes / 1024 / 1024).toFixed(1)}MB, exceeding the ${MAX_IMAGE_UPLOAD_BYTES / 1024 / 1024}MB limit.`,
    };
  }
  return { valid: true };
}

export const imageTransformationSchema = z.object({
  width: z.number().int().positive().max(4000).optional(),
  height: z.number().int().positive().max(4000).optional(),
  quality: z.number().int().min(1).max(100).optional(),
  format: z.enum(['auto', 'webp', 'jpg', 'png', 'avif']).optional(),
  crop: z.enum(['maintain_ratio', 'force', 'at_least', 'at_max']).optional(),
  focus: z.enum(['auto', 'center', 'top', 'left', 'bottom', 'right', 'face']).optional(),
  blur: z.number().int().min(1).max(100).optional(),
  rotate: z.number().int().min(-360).max(360).optional(),
});

export type UploadImageValidated = z.infer<typeof uploadImageSchema>;
export type ImageTransformationValidated = z.infer<typeof imageTransformationSchema>;
