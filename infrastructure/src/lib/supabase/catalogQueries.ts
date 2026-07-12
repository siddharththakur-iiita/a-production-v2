/**
 * src/lib/supabase/catalogQueries.ts
 *
 * REFACTOR (consistency pass, no behavior change): product.repository.ts
 * and collection.repository.ts each independently implemented an
 * identical query — "fetch the public v_product_catalog projection
 * for a given set of product ids" — used by Product for related-
 * product resolution and by Collection for collection-membership
 * resolution. Extracted here as the single implementation; both
 * repositories now delegate to it internally while keeping their own
 * exported function name/signature unchanged, so neither module's
 * public API changes and neither depends on the other's internals
 * (both depend on this neutral, shared location instead — the
 * correct shape for a query two sibling feature modules both need,
 * rather than one importing from the other's repository).
 */
import { supabase } from './client';
import type { VProductCatalogRow } from './database.types';

/** SELECT * FROM v_product_catalog WHERE id IN (:ids) */
export async function findCatalogProductsByIds(ids: string[]): Promise<VProductCatalogRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('v_product_catalog').select('*').in('id', ids);
  if (error) throw error;
  return data;
}
