# Figma to Code Setup Guide

Your project is now configured to easily replicate Figma designs using shadcn/ui components!

## ✅ What's Already Set Up

1. **shadcn/ui** - Installed and configured
2. **Tailwind CSS** - Configured with design tokens
3. **Design Tokens** - Created in `src/lib/design-tokens.ts`
4. **Figma Helper** - Utilities in `src/lib/figma-helper.ts`

## 🎨 Quick Start: From Figma to Code

### Step 1: Extract Values from Figma

When designing in Figma, note:
- **Colors**: Copy hex values (e.g., `#4736FE`)
- **Spacing**: Note padding/margin in pixels (e.g., `16px`, `24px`)
- **Typography**: Font size (e.g., `14px`, `16px`) and weight (`400`, `500`, `600`)
- **Border Radius**: Corner radius (e.g., `8px`, `12px`)

### Step 2: Use Helper Functions

```typescript
import { figmaToTailwindSpacing, figmaToTailwindTextSize } from '@/lib/figma-helper';

// Convert Figma spacing to Tailwind
const padding = figmaToTailwindSpacing(16, 'p'); // Returns 'p-4'

// Convert Figma font size to Tailwind
const fontSize = figmaToTailwindTextSize(14); // Returns 'text-sm'
```

### Step 3: Use shadcn Components

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Example: Replicating a Figma button design
<Button className="px-4 py-2 bg-brand text-white rounded-lg">
  Click me
</Button>
```

## 📋 Component Cheat Sheet

### Button
```tsx
import { Button } from '@/components/ui/button';

// Primary button
<Button className="bg-brand text-white">Click</Button>

// Secondary button
<Button variant="secondary">Click</Button>

// Custom styling
<Button className="px-6 py-3 bg-[#4736FE] rounded-xl">
  Custom Button
</Button>
```

### Input Field
```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<Label>Email</Label>
<Input type="email" placeholder="Enter email" className="w-full" />
```

### Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card className="p-6">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content here
  </CardContent>
</Card>
```

### Dialog/Modal
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

<Dialog open={isOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
    </DialogHeader>
    Modal content
  </DialogContent>
</Dialog>
```

### Form
```tsx
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

<Form>
  <FormField
    name="fieldName"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Label</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
      </FormItem>
    )}
  />
</Form>
```

## 🎯 Common Figma → Tailwind Mappings

### Spacing
- `4px` → `p-1`, `gap-1`, `m-1`
- `8px` → `p-2`, `gap-2`, `m-2`
- `12px` → `p-3`, `gap-3`, `m-3`
- `16px` → `p-4`, `gap-4`, `m-4`
- `24px` → `p-6`, `gap-6`, `m-6`
- `32px` → `p-8`, `gap-8`, `m-8`

### Font Sizes
- `12px` → `text-xs`
- `14px` → `text-sm`
- `16px` → `text-base`
- `18px` → `text-lg`
- `20px` → `text-xl`
- `24px` → `text-2xl`

### Font Weights
- `400` → `font-normal`
- `500` → `font-medium`
- `600` → `font-semibold`
- `700` → `font-bold`

### Border Radius
- `4px` → `rounded-sm`
- `8px` → `rounded-md`
- `12px` → `rounded-lg`
- `16px` → `rounded-xl`
- `9999px` → `rounded-full`

## 🔧 Customizing Theme Colors

To match your Figma brand colors, update `src/app/globals.css`:

```css
:root {
  --primary: 222 47% 11%; /* Update HSL values */
  --primary-foreground: 210 40% 98%;
}
```

Or use the brand color directly:
```tsx
<Button className="bg-brand text-white">Button</Button>
```

## 📝 Example: Replicating a Figma Card Design

**Figma Design:**
- Card with 24px padding
- 12px border radius
- White background
- Shadow: 0px 4px 12px rgba(0,0,0,0.1)
- Title: 18px, semibold
- Content: 14px, regular

**Code:**
```tsx
<Card className="p-6 rounded-lg bg-white shadow-md">
  <CardHeader>
    <CardTitle className="text-lg font-semibold">Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-sm font-normal">Content here</p>
  </CardContent>
</Card>
```

## 🚀 Next Steps

1. Design your components in Figma
2. Use the helper functions to convert Figma values
3. Use shadcn components as building blocks
4. Customize with Tailwind classes to match exactly

## 📚 Resources

- Design Tokens: `src/lib/design-tokens.ts`
- Helper Functions: `src/lib/figma-helper.ts`
- shadcn Docs: https://ui.shadcn.com
- Tailwind Docs: https://tailwindcss.com/docs

