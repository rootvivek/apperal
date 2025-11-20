/**
 * Figma Helper Utilities
 * 
 * Use these utilities to quickly convert Figma design values to Tailwind classes
 */

/**
 * Convert Figma spacing (in pixels) to Tailwind spacing class
 * @param pixels - Spacing value from Figma (e.g., 16, 24, 32)
 * @param property - CSS property: 'p' (padding), 'm' (margin), 'gap', 'w', 'h'
 * @returns Tailwind class string (e.g., 'p-4', 'gap-6')
 */
export function figmaToTailwindSpacing(
  pixels: number,
  property: 'p' | 'px' | 'py' | 'pt' | 'pr' | 'pb' | 'pl' | 'm' | 'mx' | 'my' | 'mt' | 'mr' | 'mb' | 'ml' | 'gap' | 'w' | 'h' | 'space-x' | 'space-y' = 'p'
): string {
  // Tailwind uses 4px increments: 4px = 1, 8px = 2, 16px = 4, etc.
  const tailwindValue = Math.round(pixels / 4);
  
  // Handle common Figma spacing values
  const spacingMap: Record<number, number> = {
    2: 0.5,   // 2px → 0.5
    3: 0.5,   // 3px → 0.5
    4: 1,     // 4px → 1
    6: 1.5,   // 6px → 1.5
    8: 2,     // 8px → 2
    12: 3,    // 12px → 3
    16: 4,    // 16px → 4
    20: 5,    // 20px → 5
    24: 6,    // 24px → 6
    32: 8,    // 32px → 8
    40: 10,   // 40px → 10
    48: 12,   // 48px → 12
    64: 16,   // 64px → 16
  };
  
  const value = spacingMap[pixels] || tailwindValue;
  
  // Handle fractional values
  if (value % 1 !== 0) {
    return `${property}-[${pixels}px]`; // Use arbitrary value
  }
  
  return `${property}-${value}`;
}

/**
 * Convert Figma font size to Tailwind text size class
 * @param pixels - Font size from Figma (e.g., 14, 16, 18, 24)
 * @returns Tailwind class string (e.g., 'text-sm', 'text-base', 'text-lg')
 */
export function figmaToTailwindTextSize(pixels: number): string {
  const sizeMap: Record<number, string> = {
    10: 'text-[10px]',
    11: 'text-[11px]',
    12: 'text-xs',      // 12px
    13: 'text-[13px]',
    14: 'text-sm',      // 14px
    15: 'text-[15px]',
    16: 'text-base',    // 16px
    18: 'text-lg',      // 18px
    20: 'text-xl',      // 20px
    24: 'text-2xl',     // 24px
    30: 'text-3xl',     // 30px
    36: 'text-4xl',     // 36px
    48: 'text-5xl',     // 48px
    60: 'text-6xl',     // 60px
    72: 'text-7xl',     // 72px
  };
  
  return sizeMap[pixels] || `text-[${pixels}px]`;
}

/**
 * Convert Figma font weight to Tailwind font weight class
 * @param weight - Font weight from Figma (e.g., 400, 500, 600, 700)
 * @returns Tailwind class string (e.g., 'font-normal', 'font-medium', 'font-semibold')
 */
export function figmaToTailwindFontWeight(weight: number): string {
  const weightMap: Record<number, string> = {
    300: 'font-light',
    400: 'font-normal',
    500: 'font-medium',
    600: 'font-semibold',
    700: 'font-bold',
    800: 'font-extrabold',
    900: 'font-black',
  };
  
  return weightMap[weight] || `font-[${weight}]`;
}

/**
 * Convert Figma border radius to Tailwind rounded class
 * @param pixels - Border radius from Figma (e.g., 4, 8, 12, 16)
 * @returns Tailwind class string (e.g., 'rounded-sm', 'rounded-md', 'rounded-lg')
 */
export function figmaToTailwindRadius(pixels: number): string {
  const radiusMap: Record<number, string> = {
    0: 'rounded-none',
    2: 'rounded-sm',
    4: 'rounded-sm',
    6: 'rounded-md',
    8: 'rounded-md',
    12: 'rounded-lg',
    16: 'rounded-xl',
    24: 'rounded-2xl',
    9999: 'rounded-full',
  };
  
  return radiusMap[pixels] || `rounded-[${pixels}px]`;
}

/**
 * Convert Figma hex color to Tailwind color class (if using custom colors)
 * For brand colors, use the color name directly (e.g., 'bg-brand')
 * @param hex - Hex color from Figma (e.g., '#4736FE')
 * @returns Tailwind class string or hex value
 */
export function figmaToTailwindColor(hex: string, type: 'bg' | 'text' | 'border' = 'bg'): string {
  // If it's a brand color, use the brand class
  if (hex.toUpperCase() === '#4736FE') {
    return `${type}-brand`;
  }
  
  // For other colors, you might want to add them to tailwind.config.ts
  // For now, return arbitrary value
  return `${type}-[${hex}]`;
}

/**
 * Quick reference: Common Figma → Tailwind mappings
 */
export const figmaMappings = {
  spacing: {
    '4px': 'p-1 gap-1',
    '8px': 'p-2 gap-2',
    '12px': 'p-3 gap-3',
    '16px': 'p-4 gap-4',
    '20px': 'p-5 gap-5',
    '24px': 'p-6 gap-6',
    '32px': 'p-8 gap-8',
    '40px': 'p-10 gap-10',
    '48px': 'p-12 gap-12',
  },
  fontSize: {
    '12px': 'text-xs',
    '14px': 'text-sm',
    '16px': 'text-base',
    '18px': 'text-lg',
    '20px': 'text-xl',
    '24px': 'text-2xl',
    '30px': 'text-3xl',
  },
  fontWeight: {
    '400': 'font-normal',
    '500': 'font-medium',
    '600': 'font-semibold',
    '700': 'font-bold',
  },
  borderRadius: {
    '4px': 'rounded-sm',
    '8px': 'rounded-md',
    '12px': 'rounded-lg',
    '16px': 'rounded-xl',
    '9999px': 'rounded-full',
  },
} as const;

