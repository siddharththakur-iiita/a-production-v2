/**
 * src/lib/storage/documentUpload.server.ts
 *
 * SERVER-ONLY. Implements StorageUploader for private, RLS-gated
 * documents (Tailoring reference images, Order invoice PDFs) —
 * delegates entirely to the existing uploadPrivateFile/deletePrivateFile
 * (supabase/storageHelpers.ts) and getPrivateSignedUrl
 * (supabase/storage.ts), reusing both rather than reimplementing
 * Supabase Storage calls a second time.
 *
 * uploadPrivateFile only accepts File | Blob | ArrayBuffer (its own
 * declared signature) — a Buffer input is converted to ArrayBuffer
 * here first, correctly accounting for Buffer.byteOffset/length
 * (a Buffer can be a view into a larger underlying ArrayBuffer, so a
 * naive `.buffer` access would include unrelated bytes outside the
 * Buffer's own view).
 *
 * "path" must follow the exact folder convention storage.objects RLS
 * (015_storage.sql) checks against: reference-images/{tailoring_request_id}/{filename}
 * or invoices/{order_id}/{filename} — the caller's `folder` parameter
 * is expected to already be one of those two prefixes, not decided
 * here.
 */
import { uploadPrivateFile, deletePrivateFile } from '../supabase/storageHelpers';
import { getPrivateSignedUrl } from '../supabase/storage';
import type { StorageUploader, StorageUploadResult } from './uploadAbstraction';

type UploadableFile = File | Blob | ArrayBuffer;

function toUploadableFile(file: File | Blob | ArrayBuffer | Buffer | string): UploadableFile {
  if (typeof file === 'string') {
    throw new Error(
      'documentUpload.server.ts does not accept a string file input — pass a File, Blob, ArrayBuffer, or Buffer.'
    );
  }
  if (file instanceof Buffer) {
    // Buffer.buffer is typed as ArrayBufferLike (which technically
    // includes SharedArrayBuffer) but is always a real ArrayBuffer for
    // ordinary file-upload Buffers (Buffer.from/Buffer.alloc, never a
    // worker_threads SharedArrayBuffer-backed view) — asserted here
    // rather than left as a type error over a case that cannot
    // actually occur in this server-only upload path.
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
  }
  // string and Buffer are both handled above; TypeScript's control-flow
  // narrowing doesn't fully exclude Buffer from this point given its
  // structural overlap with the DOM Blob/ArrayBuffer types in the
  // source union, so this is asserted explicitly rather than relying
  // on narrowing that doesn't resolve cleanly here.
  return file as UploadableFile;
}

function sizeOf(file: UploadableFile): number {
  if (file instanceof ArrayBuffer) return file.byteLength;
  return (file as Blob).size;
}

export const documentUploader: StorageUploader = {
  async upload(params): Promise<StorageUploadResult> {
    const file = toUploadableFile(params.file);
    const storagePath = `${params.folder}/${params.fileName}`;

    const result = await uploadPrivateFile(storagePath, file, params.contentType);
    const signedUrl = await getPrivateSignedUrl(result.storagePath);

    return { id: result.storagePath, path: result.storagePath, url: signedUrl, sizeBytes: sizeOf(file) };
  },

  async delete(id: string): Promise<void> {
    await deletePrivateFile(id);
  },
};
