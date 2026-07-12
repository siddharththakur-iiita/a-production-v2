/**
 * src/lib/storage/imageUpload.server.ts
 *
 * SERVER-ONLY (delegates to ImageKit, which is itself server-only —
 * see imagekit.client.server.ts's guard). Implements StorageUploader
 * for public product/CMS images. This is the sanctioned path for any
 * new public image upload going forward — see imagekit's own module
 * docstring in imagekit.types.ts for why ImageKit rather than the
 * catalog-public Supabase bucket is preferred for new uploads
 * (transformation/CDN benefits).
 */
import { uploadImage } from '../imagekit/imagekit.upload.server';
import { deleteImage } from '../imagekit/imagekit.delete.server';
import { validateImageFile } from '../imagekit/imagekit.validation';
import { ImageKitError } from '../imagekit/imagekit.errors';
import type { StorageUploader, StorageUploadResult } from './uploadAbstraction';

async function toArrayBuffer(file: Blob | ArrayBuffer): Promise<ArrayBuffer> {
  return file instanceof ArrayBuffer ? file : await file.arrayBuffer();
}

export const imageUploader: StorageUploader = {
  async upload(params): Promise<StorageUploadResult> {
    // A string input (base64 data URI or a remote URL for ImageKit to
    // fetch — both are documented, accepted shapes for
    // UploadImageInput.file, imagekit.types.ts) has no locally
    // knowable byte size — a remote URL in particular cannot be
    // measured without fetching it first, which would defeat the
    // point of letting ImageKit fetch it server-side. Pre-validation
    // in that case is skipped; ImageKit's own upload API still
    // enforces its account-level size/type limits, and
    // mapImageKitError still classifies whatever it rejects.
    if (typeof params.file === 'string') {
      const result = await uploadImage(
        { file: params.file, fileName: params.fileName, folder: params.folder },
        { mimeType: params.contentType ?? 'application/octet-stream', sizeBytes: 0 }
      );
      return { id: result.fileId, path: result.filePath, url: result.url, sizeBytes: result.size };
    }

    if (!params.contentType) {
      throw new ImageKitError(
        'validation_failed',
        'contentType is required for Buffer/Blob/ArrayBuffer image uploads.'
      );
    }

    const fileBuffer =
      params.file instanceof Buffer
        ? params.file
        : Buffer.from(await toArrayBuffer(params.file as Blob | ArrayBuffer));

    const fileCheck = validateImageFile({ mimeType: params.contentType, sizeBytes: fileBuffer.byteLength });
    if (!fileCheck.valid) {
      throw new ImageKitError(fileCheck.code ?? 'invalid_file_type', fileCheck.reason ?? 'Invalid image file.');
    }

    const result = await uploadImage(
      { file: fileBuffer, fileName: params.fileName, folder: params.folder },
      { mimeType: params.contentType, sizeBytes: fileBuffer.byteLength }
    );

    return { id: result.fileId, path: result.filePath, url: result.url, sizeBytes: result.size };
  },

  async delete(id: string): Promise<void> {
    await deleteImage(id);
  },
};
