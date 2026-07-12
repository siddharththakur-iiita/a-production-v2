/**
 * src/lib/imagekit/imagekit.url.ts
 *
 * Client-safe: builds ImageKit transformation URLs from a file path.
 * Needs only the public URL endpoint (clientEnv.VITE_IMAGEKIT_URL_ENDPOINT),
 * never a secret, so — unlike upload/delete — this file has no
 * server-only guard and may be imported from browser code (e.g. to
 * render a responsive <img> directly from a product's stored
 * ImageKit filePath).
 */
import { clientEnv } from '../env/env';
import type { ImageTransformation } from './imagekit.types';

function transformationToQueryFragment(t: ImageTransformation): string {
  const parts: string[] = [];
  if (t.width) parts.push(`w-${t.width}`);
  if (t.height) parts.push(`h-${t.height}`);
  if (t.quality) parts.push(`q-${t.quality}`);
  if (t.format) parts.push(`f-${t.format}`);
  if (t.crop) parts.push(`c-${t.crop}`);
  if (t.focus) parts.push(`fo-${t.focus}`);
  if (t.blur) parts.push(`bl-${t.blur}`);
  if (t.rotate !== undefined) parts.push(`rt-${t.rotate}`);
  return parts.join(',');
}

export function buildImageKitUrl(filePath: string, transformation?: ImageTransformation): string {
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  const base = `${clientEnv.VITE_IMAGEKIT_URL_ENDPOINT}${normalizedPath}`;

  if (!transformation || Object.keys(transformation).length === 0) {
    return base;
  }

  const fragment = transformationToQueryFragment(transformation);
  return fragment ? `${base}?tr=${fragment}` : base;
}

export function buildImageKitSrcSet(
  filePath: string,
  widths: number[],
  baseTransformation: Omit<ImageTransformation, 'width'> = {}
): { url: string; width: number }[] {
  return widths.map((width) => ({
    url: buildImageKitUrl(filePath, { ...baseTransformation, width }),
    width,
  }));
}
