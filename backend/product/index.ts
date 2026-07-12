/**
 * src/features/category/index.ts
 *
 * Public surface of the Category module. Page/component code and
 * other feature modules (Product depends on this) should import
 * exclusively from here.
 */
export {
  useCategories,
  useCategoryTree,
  useCategory,
  useCategoryBySlug,
  useCreateCategory,
  useUpdateCategory,
  useDeactivateCategory,
  useReactivateCategory,
} from './category.hooks';

export {
  listCategories,
  getCategoryTree,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deactivateCategory,
  reactivateCategory,
} from './category.service';

export { categoryQueryKeys } from './category.queryKeys';

export type {
  Category,
  CategoryTreeNode,
  CreateCategoryInput,
  UpdateCategoryInput,
  ListCategoriesParams,
} from './category.types';

export { CategoryError } from './category.errors';
export type { CategoryErrorCode } from './category.errors';
