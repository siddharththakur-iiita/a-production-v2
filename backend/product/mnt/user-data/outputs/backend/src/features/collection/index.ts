/**
 * src/features/collection/index.ts
 */
export {
  usePublishedCollections,
  useCollectionsForStaff,
  useCollectionBySlug,
  useCollection,
  useCollectionProducts,
  useCreateCollection,
  useUpdateCollection,
  usePublishCollection,
  useArchiveCollection,
  useRevertCollectionToDraft,
  useDeleteCollection,
  useAddProductToCollection,
  useRemoveProductFromCollection,
  useReorderProductInCollection,
} from './collection.hooks';

export {
  listPublishedCollections,
  listCollectionsForStaff,
  getCollectionBySlug,
  getCollectionById,
  getCollectionProducts,
  createCollection,
  updateCollection,
  publishCollection,
  archiveCollection,
  revertCollectionToDraft,
  deleteCollection,
  addProductToCollection,
  removeProductFromCollection,
  reorderProductInCollection,
} from './collection.service';

export { collectionQueryKeys } from './collection.queryKeys';

export type {
  Collection,
  CollectionStatus,
  CollectionProduct,
  CreateCollectionInput,
  UpdateCollectionInput,
} from './collection.types';

export { CollectionError } from './collection.errors';
export type { CollectionErrorCode } from './collection.errors';
