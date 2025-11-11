/**
 * Figma API Integration
 * 
 * This utility helps fetch designs and assets from Figma
 * To use this, you need a Figma Personal Access Token
 * 
 * Get your token from: https://www.figma.com/settings
 */

const FIGMA_API_BASE = 'https://api.figma.com/v1';

interface FigmaFileResponse {
  document: any;
  components: Record<string, any>;
  styles: Record<string, any>;
}

interface FigmaImageResponse {
  images: Record<string, string>;
}

/**
 * Fetch a Figma file by file key
 */
export async function fetchFigmaFile(fileKey: string, token: string): Promise<FigmaFileResponse> {
  const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
    headers: {
      'X-Figma-Token': token,
    },
  });

  if (!response.ok) {
    throw new Error(`Figma API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get images from Figma file
 */
export async function getFigmaImages(
  fileKey: string,
  nodeIds: string[],
  token: string,
  format: 'png' | 'svg' | 'jpg' = 'png',
  scale: 1 | 2 | 4 = 2
): Promise<FigmaImageResponse> {
  const ids = nodeIds.join(',');
  const response = await fetch(
    `${FIGMA_API_BASE}/images/${fileKey}?ids=${ids}&format=${format}&scale=${scale}`,
    {
      headers: {
        'X-Figma-Token': token,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Figma API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Extract design tokens from Figma file
 * (colors, typography, spacing, etc.)
 */
export function extractDesignTokens(figmaFile: FigmaFileResponse) {
  const tokens = {
    colors: {} as Record<string, string>,
    typography: {} as Record<string, any>,
    spacing: {} as Record<string, number>,
  };

  // Extract colors from styles
  Object.entries(figmaFile.styles || {}).forEach(([key, style]: [string, any]) => {
    if (style.styleType === 'FILL') {
      tokens.colors[key] = style.description || '';
    }
  });

  // You can extend this to extract more tokens
  return tokens;
}

/**
 * Get component information from Figma file
 */
export function getFigmaComponents(figmaFile: FigmaFileResponse) {
  return Object.entries(figmaFile.components || {}).map(([key, component]: [string, any]) => ({
    id: key,
    name: component.name,
    description: component.description,
    ...component,
  }));
}

