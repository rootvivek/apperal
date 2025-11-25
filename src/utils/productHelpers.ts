// Helper function to convert color names to hex codes
export const getColorHex = (colorName: string): string => {
  const colorMap: { [key: string]: string } = {
    'jet black': '#000000',
    'black': '#000000',
    'white': '#FFFFFF',
    'grey': '#808080',
    'gray': '#808080',
    'red': '#FF0000'
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
    'l': 'L'
  };
  
  const normalized = size.toLowerCase().trim();
  return sizeMap[normalized] || size.toUpperCase();
};

