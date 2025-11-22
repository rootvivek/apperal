// Helper function to convert color names to hex codes
export const getColorHex = (colorName: string): string => {
  const colorMap: { [key: string]: string } = {
    'jet black': '#000000',
    'black': '#000000',
    'white': '#FFFFFF',
    'grey': '#808080',
    'gray': '#808080',
    'red': '#FF0000',
    'blue': '#0000FF',
    'green': '#008000',
    'yellow': '#FFFF00',
    'pink': '#FFC0CB',
    'purple': '#800080',
    'orange': '#FFA500',
    'brown': '#A52A2A',
    'navy': '#000080',
    'beige': '#F5F5DC',
    'tan': '#D2B48C',
    'maroon': '#800000',
    'olive': '#808000',
    'teal': '#008080',
    'cyan': '#00FFFF',
    'magenta': '#FF00FF',
    'lime': '#00FF00',
    'silver': '#C0C0C0',
    'gold': '#FFD700',
  };
  
  const normalized = colorName.toLowerCase().trim();
  return colorMap[normalized] || '#CCCCCC';
};

// Helper function to convert full size names to abbreviations
export const getSizeAbbreviation = (size: string): string => {
  const sizeMap: { [key: string]: string } = {
    'extra small': 'XS',
    'extra-small': 'XS',
    'xs': 'XS',
    'small': 'S',
    's': 'S',
    'medium': 'M',
    'm': 'M',
    'large': 'L',
    'l': 'L',
    'extra large': 'XL',
    'extra-large': 'XL',
    'xl': 'XL',
    '2xl': '2XL',
    'xxl': '2XL',
    'extra extra large': '2XL',
    '3xl': '3XL',
    'xxxl': '3XL',
    '4xl': '4XL',
    'xxxxl': '4XL',
  };
  
  const normalized = size.toLowerCase().trim();
  return sizeMap[normalized] || size.toUpperCase();
};

