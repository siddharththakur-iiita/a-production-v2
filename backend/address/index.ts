/**
 * src/features/address/index.ts
 */
export {
  useAddressesForCustomer,
  useAddress,
  useCreateAddress,
  useUpdateAddress,
  useSetDefaultAddress,
  useDeleteAddress,
} from './address.hooks';

export {
  listAddressesForCustomer,
  getAddressById,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} from './address.service';

export { addressQueryKeys } from './address.queryKeys';

export type { Address, CreateAddressInput, UpdateAddressInput } from './address.types';

export { AddressError } from './address.errors';
export type { AddressErrorCode } from './address.errors';
