import { useState, useEffect, useMemo } from 'react';

interface UseProductSelectionsProps {
  slug: string;
  productApparelDetails?: {
    size: string;
    color: string;
  };
  onAddToCart: () => void;
  onBuyNow: () => void;
}

export function useProductSelections({
  slug,
  productApparelDetails,
  onAddToCart,
  onBuyNow,
}: UseProductSelectionsProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [hasAddedToCart, setHasAddedToCart] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [modalErrors, setModalErrors] = useState<{size?: boolean; color?: boolean}>({});

  // Parse available sizes and colors once
  const { availableSizes, availableColors } = useMemo(() => {
    if (!productApparelDetails) {
      return { availableSizes: [], availableColors: [] };
    }

    const sizes = productApparelDetails.size
      ? productApparelDetails.size.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
    
    const colors = productApparelDetails.color
      ? productApparelDetails.color.split(',').map((c: string) => c.trim()).filter(Boolean)
      : [];

    return { availableSizes: sizes, availableColors: colors };
  }, [productApparelDetails]);

  // Load selections from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !slug) return;

    const savedSize = localStorage.getItem(`selectedSize_${slug}`);
    const savedColor = localStorage.getItem(`selectedColor_${slug}`);

    if (savedSize && availableSizes.includes(savedSize)) {
      setSelectedSize(savedSize);
    }
    if (savedColor && availableColors.includes(savedColor)) {
      setSelectedColor(savedColor);
    }
  }, [slug, availableSizes, availableColors]);

  // Selection functions
  const selectSize = (size: string) => {
    setSelectedSize(size);
    setModalErrors(prev => ({ ...prev, size: false }));
    if (typeof window !== 'undefined' && slug) {
      localStorage.setItem(`selectedSize_${slug}`, size);
    }
  };

  const selectColor = (color: string) => {
    setSelectedColor(color);
    setModalErrors(prev => ({ ...prev, color: false }));
    if (typeof window !== 'undefined' && slug) {
      localStorage.setItem(`selectedColor_${slug}`, color);
    }
  };

  const changeQuantity = (qty: number) => {
    setQuantity(qty);
  };

  // Validation function
  const checkSelections = (showModal = true, showErrors = false): boolean => {
    if (!productApparelDetails) return true;
    
    const errors: {size?: boolean; color?: boolean} = {};
    let hasMissing = false;
    
    if (!selectedSize) {
      if (showErrors) errors.size = true;
      hasMissing = true;
    }
    if (!selectedColor) {
      if (showErrors) errors.color = true;
      hasMissing = true;
    }
    
    if (hasMissing) {
      if (showErrors) {
        setModalErrors(errors);
      }
      if (showModal) {
        setShowSelectionModal(true);
      }
      return false;
    }
    setModalErrors({});
    return true;
  };

  // Action functions with validation
  const addToCartWithValidation = () => {
    if (checkSelections()) {
      onAddToCart();
      setHasAddedToCart(true);
    }
  };

  const buyNowWithValidation = () => {
    if (checkSelections()) {
      onBuyNow();
    }
  };

  // Modal action handlers
  const handleModalAddToCart = () => {
    if (checkSelections(false, true)) {
      setShowSelectionModal(false);
      onAddToCart();
      setHasAddedToCart(true);
    }
  };

  const handleModalBuyNow = () => {
    if (checkSelections(false, true)) {
      setShowSelectionModal(false);
      onBuyNow();
    }
  };

  const closeModal = () => {
    setShowSelectionModal(false);
    setModalErrors({});
  };

  return {
    // State
    quantity,
    selectedSize,
    selectedColor,
    hasAddedToCart,
    showSelectionModal,
    modalErrors,
    availableSizes,
    availableColors,
    // Actions
    selectSize,
    selectColor,
    changeQuantity,
    addToCartWithValidation,
    buyNowWithValidation,
    handleModalAddToCart,
    handleModalBuyNow,
    closeModal,
  };
}

