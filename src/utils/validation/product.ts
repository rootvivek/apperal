import type { ProductFormData } from '@/types/admin';

export interface ProductValidationErrors {
  [key: string]: string | undefined;
  name?: string;
  description?: string;
  price?: string;
  category?: string;
  subcategories?: string;
  stock_quantity?: string;
}

export interface ProductValidationResult {
  isValid: boolean;
  errors: ProductValidationErrors;
}

/**
 * Validates product form data
 */
export function validateProductForm(formData: ProductFormData): ProductValidationResult {
  const errors: ProductValidationErrors = {};

  if (!formData.name?.trim()) {
    errors.name = 'Product name is required';
  }

  if (!formData.description?.trim()) {
    errors.description = 'Product description is required';
  }

  if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
    errors.price = 'Valid price is required';
  }

  if (!formData.category) {
    errors.category = 'Category is required';
  }

  if (!formData.subcategories || formData.subcategories.length === 0) {
    errors.subcategories = 'At least one subcategory is required';
  }

  if (formData.stock_quantity && (isNaN(parseInt(formData.stock_quantity)) || parseInt(formData.stock_quantity) < 0)) {
    errors.stock_quantity = 'Stock quantity must be a valid positive number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

