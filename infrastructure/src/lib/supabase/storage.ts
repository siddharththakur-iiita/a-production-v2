/**
 * src/lib/supabase/storage.ts
 *
 * Resolves a media_asset.storage_path into a usable URL, for both
 * storage buckets created in 015_storage.sql:
 *   - catalog-public: public assets, resolved via getCatalogPublicUrl.
 *   - private-media: reference images (Tailoring module) and invoice
 *     PDFs (Orders module), resolved via getPrivateSignedUrl. Both
 *     modules need the identical operation (a short-lived signed URL
 *     against the same private bucket), so it lives here once rather
 *     than being duplicated in each module — this file's own header
 *     previously deferred this to "their own modules," which would
 *     have been genuine duplication once both needed it; centralizing
 *     it here instead, now that the need is real in two places.
 */
import { supabase } from './client';

const CATALOG_PUBLIC_BUCKET = 'catalog-public';
const PRIVATE_MEDIA_BUCKET = 'private-media';

/**
 * Returns the public URL for a storage_path in the catalog-public
 * bucket. Safe to call for any product_image/product_video/collection
 * hero image — those are always public assets per 015_storage.sql's
 * bucket convention.
 */
export function getCatalogPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(CATALOG_PUBLIC_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Returns a short-lived signed URL for a storage_path in the
 * private-media bucket (reference-images/{tailoring_request_id}/...
 * or invoices/{order_id}/...). Requires the caller to already be
 * authorized to read the underlying row per RLS (016_rls.sql) — this
 * function does not itself check ownership; it relies on the
 * storage.objects RLS policies (015_storage.sql) to reject the signed
 * URL request if the caller isn't entitled to that specific object.
 * Defaults to a 5-minute expiry, appropriate for "view this now"
 * usage (e.g. rendering an image in a page) rather than long-lived
 * sharing.
 */
export async function getPrivateSignedUrl(storagePath: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PRIVATE_MEDIA_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) throw error;
  return data.signedUrl;
}
