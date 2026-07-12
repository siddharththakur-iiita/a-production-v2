/**
 * src/lib/imagekit/imagekit.delete.server.ts
 *
 * SERVER-ONLY.
 */
import { getImageKitClient } from './imagekit.client.server';
import { mapImageKitError, ImageKitError } from './imagekit.errors';

export async function deleteImage(fileId: string): Promise<void> {
  if (!fileId) {
    throw new ImageKitError('validation_failed', 'fileId is required.');
  }

  try {
    const client = getImageKitClient();
    await client.deleteFile(fileId);
  } catch (err) {
    throw mapImageKitError(err);
  }
}

/** Bulk delete — ImageKit's own API accepts up to 100 file IDs per call; batches larger inputs automatically. */
export async function deleteImages(fileIds: string[]): Promise<void> {
  if (fileIds.length === 0) return;

  const client = getImageKitClient();
  const BATCH_SIZE = 100;

  try {
    for (let i = 0; i < fileIds.length; i += BATCH_SIZE) {
      const batch = fileIds.slice(i, i + BATCH_SIZE);
      await client.bulkDeleteFiles(batch);
    }
  } catch (err) {
    throw mapImageKitError(err);
  }
}
