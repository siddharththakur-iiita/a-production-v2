/**
 * src/features/product/index.ts
 */
export {
  useProducts,
  useProductSearch,
  useProduct,
  useProductForStaff,
  useProductTaxonomyIds,
  useCreateProduct,
  useUpdateProduct,
  usePublishProduct,
  useArchiveProduct,
  useRevertProductToDraft,
  useSetProductFeatured,
  useSetProductTrending,
  useDeleteProduct,
  useAddProductImage,
  useRemoveProductImage,
  useSetPrimaryImage,
  useAddProductSpecification,
  useRemoveProductSpecification,
  useAssignTaxonomy,
  useUnassignTaxonomy,
} from './product.hooks';

export {
  listProducts,
  searchProducts,
  getProductBySlug,
  getProductByIdForStaff,
  createProduct,
  updateProduct,
  publishProduct,
  archiveProduct,
  revertProductToDraft,
  setProductFeatured,
  setProductTrending,
  deleteProduct,
  addProductImage,
  removeProductImage,
  setPrimaryImage,
  reorderImage,
  addProductSpecification,
  removeProductSpecification,
  assignTaxonomy,
  unassignTaxonomy,
  getProductTaxonomyIds,
} from './product.service';

export { productQueryKeys } from './product.queryKeys';

export type {
  ProductSummary,
  ProductDetail,
  ProductImage,
  ProductSpecification,
  VariantAvailability,
  VariantAvailabilityStatus,
  ListProductsParams,
  SearchProductsParams,
  CreateProductInput,
  UpdateProductInput,
  AddProductImageInput,
  AddProductSpecificationInput,
  ProductSortColumn,
} from './product.types';

export { ProductError } from './product.errors';
export type { ProductErrorCode } from './product.errors';
