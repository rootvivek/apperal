// Layout utility constants for consistent grid classes

// Responsive product grid with breakpoints:
// < 460px: 2 columns
// >= 768px: 3 columns
// >= 1024px: 4 columns (desktop)
// >= 1280px: 5 columns
// >= 1440px: 5 columns
// >= 1920px: 6 columns
export const PRODUCT_GRID_CLASSES_RESPONSIVE = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl-custom:grid-cols-5 3xl:grid-cols-6 gap-2";

// Product grid classes - used across multiple pages (legacy)
export const PRODUCT_GRID_CLASSES = "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4";

// Product grid classes with smaller gaps (for carousels) - legacy
export const PRODUCT_GRID_CLASSES_SMALL_GAP = "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2";

// Category/Subcategory grid classes
export const CATEGORY_GRID_CLASSES = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4";

// Category grid classes (alternative - used in ProductListing)
export const CATEGORY_GRID_CLASSES_ALT = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2";

