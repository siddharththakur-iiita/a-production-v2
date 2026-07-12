/**
 * src/lib/supabase/storageHelpers.ts
 *
 * Upload/delete operations against Supabase Storage — distinct from
 * storage.ts, which only ever resolves URLs for files that are
 * already uploaded (getCatalogPublicUrl/getPrivateSignedUrl). No
 * module ever implemented the actual upload/delete side, so this is
 * genuinely new infrastructure, not a duplicate.
 *
 * Covers both buckets created in 015_storage.sql:
 *   - catalog-public: product/CMS images. Public product images are
 *     expected to move to ImageKit going forward (see
 *     src/lib/imagekit) for its transformation/CDN benefits, but this
 *     bucket and these helpers remain the correct path for any public
 *     asset that doesn't need image transformation, and for anything
 *     already stored here.
 *   - private-media: reference images (Tailoring) and invoice PDFs
 *     (Orders), gated by the storage.objects RLS policies in
 *     015_storage.sql (folder-scoped ownership checks).
 */
import { supabase } from './client';

const CATALOG_PUBLIC_BUCKET = 'catalog-public';
const PRIVATE_MEDIA_BUCKET = 'private-media';

export interface UploadResult {
  storagePath: string;
  fullPath: string;
}

export async function uploadPublicFile(
  storagePath: string,
  file: File | Blob | ArrayBuffer,
  contentType?: string
): Promise<UploadResult> {
  const { data, error } = await supabase.storage
    .from(CATALOG_PUBLIC_BUCKET)
    .upload(storagePath, file, { contentType, upsert: false });

  if (error) throw error;
  return { storagePath: data.path, fullPath: data.fullPath };
}

export async function deletePublicFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(CATALOG_PUBLIC_BUCKET).remove([storagePath]);
  if (error) throw error;
}

export async function uploadPrivateFile(
  storagePath: string,
  file: File | Blob | ArrayBuffer,
  contentType?: string
): Promise<UploadResult> {
  const { data, error } = await supabase.storage
    .from(PRIVATE_MEDIA_BUCKET)
    .upload(storagePath, file, { contentType, upsert: false });

  if (error) throw error;
  return { storagePath: data.path, fullPath: data.fullPath };
}

export async function deletePrivateFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(PRIVATE_MEDIA_BUCKET).remove([storagePath]);
  if (error) throw error;
}
