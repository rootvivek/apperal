/**
 * Figma API Client
 * 
 * Fetches design data from Figma API to extract design tokens and component specs
 */

const FIGMA_API_KEY = process.env.NEXT_PUBLIC_FIGMA_API_KEY || '';
const FIGMA_API_BASE = 'https://api.figma.com/v1';

interface FigmaFileResponse {
  document: any;
  components: Record<string, any>;
  styles: Record<string, any>;
}

interface FigmaNodeResponse {
  nodes: Record<string, {
    document: any;
    components: Record<string, any>;
    styles: Record<string, any>;
  }>;
}

/**
 * Fetch Figma file data
 */
export async function fetchFigmaFile(fileKey: string): Promise<FigmaFileResponse> {
  const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
    headers: {
      'X-Figma-Token': FIGMA_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Figma API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch specific nodes from Figma file
 */
export async function fetchFigmaNodes(
  fileKey: string,
  nodeIds: string[]
): Promise<FigmaNodeResponse> {
  const nodeIdsParam = nodeIds.join(',');
  const response = await fetch(
    `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${nodeIdsParam}`,
    {
      headers: {
        'X-Figma-Token': FIGMA_API_KEY,
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
 */
export function extractDesignTokens(figmaData: FigmaFileResponse) {
  const tokens = {
    colors: {} as Record<string, string>,
    typography: {} as Record<string, any>,
    spacing: [] as number[],
    borderRadius: [] as number[],
  };

  // Extract colors from styles
  if (figmaData.styles) {
    Object.values(figmaData.styles).forEach((style: any) => {
      if (style.styleType === 'FILL' && style.paints) {
        style.paints.forEach((paint: any) => {
          if (paint.type === 'SOLID' && paint.color) {
            const hex = rgbToHex(paint.color.r, paint.color.g, paint.color.b);
            tokens.colors[style.name] = hex;
          }
        });
      }
    });
  }

  return tokens;
}

/**
 * Convert RGB to Hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
}

/**
 * Get file key from Figma URL
 */
export function extractFileKeyFromUrl(url: string): string | null {
  const match = url.match(/\/design\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Get node ID from Figma URL
 */
export function extractNodeIdFromUrl(url: string): string | null {
  const match = url.match(/node-id=([^&]+)/);
  return match ? match[1] : null;
}

