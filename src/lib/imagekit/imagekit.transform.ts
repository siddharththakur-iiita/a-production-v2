/**
 * src/lib/imagekit/imagekit.transform.ts
 *
 * Named transformation presets for the concrete image contexts this
 * catalog actually renders — grid thumbnails, product detail hero,
 * cart line-item thumbnails — built on top of buildImageKitUrl rather
 * than every call site inventing its own width/quality numbers.
 */
import { buildImageKitUrl } from './imagekit.url';
import type { ImageTransformation } from './imagekit.types';

export const IMAGE_PRESETS = {
  thumbnail: { width: 80, height: 80, crop: 'maintain_ratio', quality: 70, format: 'auto' },
  cardSmall: { width: 300, height: 400, crop: 'maintain_ratio', quality: 80, format: 'auto' },
  cardMedium: { width: 480, height: 640, crop: 'maintain_ratio', quality: 80, format: 'auto' },
  detailHero: { width: 1200, height: 1600, crop: 'maintain_ratio', quality: 85, format: 'auto' },
  zoom: { width: 2000, quality: 90, format: 'auto' },
} as const satisfies Record<string, ImageTransformation>;

export type ImagePresetName = keyof typeof IMAGE_PRESETS;

export function buildPresetUrl(filePath: string, preset: ImagePresetName): string {
  return buildImageKitUrl(filePath, IMAGE_PRESETS[preset]);
}
