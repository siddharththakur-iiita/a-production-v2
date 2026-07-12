/**
 * src/lib/storage/uploadAbstraction.ts
 *
 * A single interface both concrete upload backends (ImageKit for
 * public images, Supabase private-media for gated documents)
 * implement, so calling code that doesn't care which backend a given
 * upload uses can depend on this shape rather than either backend's
 * own SDK types.
 */

export interface StorageUploadResult {
  /** Backend-specific identifier — an ImageKit fileId, or a Supabase Storage path, depending on which concrete implementation produced this result. */
  id: string;
  /** The path/key to persist in media_asset.storage_path (011_cms.sql) or reference_image (010_tailoring.sql) — whatever the calling business module's own schema column expects. */
  path: string;
  /** A URL usable immediately after upload — for a public backend this is a real, permanent URL; for a private backend, this is a short-lived signed URL only (getPrivateSignedUrl's own TTL, supabase/storage.ts) and must be re-resolved for later access, never persisted as-is. */
  url: string;
  sizeBytes: number;
}

export interface StorageUploader {
  upload(params: {
    fileName: string;
    folder: string;
    file: File | Blob | ArrayBuffer | Buffer | string;
    contentType?: string;
  }): Promise<StorageUploadResult>;
  delete(id: string): Promise<void>;
}
