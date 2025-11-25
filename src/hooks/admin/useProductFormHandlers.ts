import { useCallback } from 'react';
import type { ProductImage, Category } from '@/types/admin';
import type { ExtendedProductFormData } from './useProductForm';

interface UseProductFormHandlersProps {
  formData: ExtendedProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ExtendedProductFormData>>;
  validationErrors: { [key: string]: string | undefined };
  setValidationErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string | undefined }>>;
  categories: Category[];
  fetchSubcategories: (categoryName: string, categories: Category[]) => Promise<void>;
  customSubcategory: string;
  setCustomSubcategory: (value: string) => void;
}

interface UseProductFormHandlersReturn {
  handleImagesChange: (images: ProductImage[]) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  addCustomSubcategory: () => void;
  handleCategoryChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

/**
 * Shared form handlers for product create/edit pages
 */
export function useProductFormHandlers({
  formData,
  setFormData,
  validationErrors,
  setValidationErrors,
  categories,
  fetchSubcategories,
  customSubcategory,
  setCustomSubcategory,
}: UseProductFormHandlersProps): UseProductFormHandlersReturn {
  const handleImagesChange = useCallback((images: ProductImage[]) => {
    setFormData(prev => ({
      ...prev,
      images: images,
      image_url: images.length > 0 ? images[0].image_url : ''
    }));
  }, [setFormData]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));

    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }, [setFormData, validationErrors, setValidationErrors]);

  const addCustomSubcategory = useCallback(() => {
    if (customSubcategory.trim() && !formData.subcategories.includes(customSubcategory.trim())) {
      setFormData(prev => ({
        ...prev,
        subcategories: [...prev.subcategories, customSubcategory.trim()]
      }));
      setCustomSubcategory('');
    }
  }, [customSubcategory, formData.subcategories, setFormData, setCustomSubcategory]);

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setFormData(prev => ({
      ...prev,
      category: newCategory,
      subcategories: []
    }));
    
    fetchSubcategories(newCategory, categories);
    
    if (validationErrors.subcategories) {
      setValidationErrors(prev => ({
        ...prev,
        subcategories: ''
      }));
    }
  }, [setFormData, fetchSubcategories, categories, validationErrors, setValidationErrors]);

  return {
    handleImagesChange,
    handleChange,
    addCustomSubcategory,
    handleCategoryChange,
  };
}

