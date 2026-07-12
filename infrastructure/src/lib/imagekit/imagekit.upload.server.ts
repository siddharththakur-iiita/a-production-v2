/**
 * src/lib/imagekit/imagekit.upload.server.ts
 *
 * SERVER-ONLY (uses the ImageKit private-key client). Validates
 * before upload via imagekit.validation.ts, never trusting the
 * caller's claimed mime type/size without checking.
 */
import { getImageKitClient } from './imagekit.client.server';
import { uploadImageSchema, validateImageFile } from './imagekit.validation';
import { mapImageKitError, ImageKitError } from './imagekit.errors';
import type { ImageKitUploadResult, UploadImageInput } from './imagekit.types';

export async function uploadImage(
  input: UploadImageInput,
  fileMeta: { mimeType: string; sizeBytes: number }
): Promise<ImageKitUploadResult> {
  const parsed = uploadImageSchema.safeParse({
    fileName: input.fileName,
    folder: input.folder,
    tags: input.tags,
    useUniqueFileName: input.useUniqueFileName,
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    throw new ImageKitError('validation_failed', first?.message ?? 'Invalid upload input.', parsed.error);
  }

  const fileCheck = validateImageFile(fileMeta);
  if (!fileCheck.valid) {
    throw new ImageKitError(fileCheck.code ?? 'invalid_file_type', fileCheck.reason ?? 'Invalid file.');
  }

  try {
    const client = getImageKitClient();
    const result = await client.upload({
      file: input.file,
      fileName: parsed.data.fileName,
      folder: parsed.data.folder,
      tags: parsed.data.tags,
      useUniqueFileName: parsed.data.useUniqueFileName ?? true,
    });

    return {
      fileId: result.fileId,
      filePath: result.filePath,
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      size: result.size,
      width: result.width ?? null,
      height: result.height ?? null,
    };
  } catch (err) {
    throw mapImageKitError(err);
  }
}
