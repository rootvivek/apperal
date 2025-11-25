import type { ProductFormData } from '@/types/admin';
import type { MobileDetails, ApparelDetails, AccessoriesDetails } from '@/utils/productDetailsMapping';

export interface ExtendedProductFormData extends Omit<ProductFormData, 'mobileDetails' | 'apparelDetails' | 'accessoriesDetails'> {
  mobileDetails: Partial<MobileDetails>;
  apparelDetails: Partial<ApparelDetails>;
  accessoriesDetails: Partial<AccessoriesDetails>;
}

