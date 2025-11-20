/**
 * Example Component: Replicating Figma Design with shadcn/ui
 * 
 * This is a template showing how to replicate a Figma card design
 * using shadcn components and Tailwind classes.
 */

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { figmaToTailwindSpacing, figmaToTailwindTextSize } from '@/lib/figma-helper';

/**
 * Example: Figma Card Design
 * 
 * Figma Specs:
 * - Padding: 24px
 * - Border Radius: 12px
 * - Shadow: Medium
 * - Title: 18px, Semibold
 * - Body: 14px, Regular
 * - Button: 16px padding, Brand color
 */
export function FigmaCardExample() {
  // Convert Figma values to Tailwind
  const cardPadding = figmaToTailwindSpacing(24, 'p'); // 'p-6'
  const titleSize = figmaToTailwindTextSize(18); // 'text-lg'
  const bodySize = figmaToTailwindTextSize(14); // 'text-sm'

  return (
    <Card className={`${cardPadding} rounded-lg shadow-md`}>
      <CardHeader>
        <CardTitle className={`${titleSize} font-semibold`}>
          Card Title from Figma
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`${bodySize} font-normal text-gray-600`}>
          This is the card content matching your Figma design.
          All spacing, typography, and colors are mapped from Figma values.
        </p>
      </CardContent>
      <CardFooter>
        <Button className="px-4 py-2 bg-brand text-white rounded-lg">
          Action Button
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Direct Tailwind Approach (Recommended)
 * 
 * Instead of using helper functions, you can directly use Tailwind classes
 * based on Figma measurements:
 */
export function DirectFigmaCardExample() {
  return (
    <Card className="p-6 rounded-lg shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Card Title
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-normal text-gray-600">
          Content here
        </p>
      </CardContent>
      <CardFooter>
        <Button className="px-4 py-2 bg-brand text-white rounded-lg">
          Button
        </Button>
      </CardFooter>
    </Card>
  );
}

