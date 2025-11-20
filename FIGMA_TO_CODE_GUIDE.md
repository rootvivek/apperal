# Figma to Code Guide - Using shadcn/ui Components

This guide helps you replicate Figma designs in Cursor using shadcn/ui components.

## Quick Start

1. **Design in Figma** - Create your UI components and layouts
2. **Extract Design Tokens** - Note colors, spacing, typography from Figma
3. **Map to shadcn Components** - Use shadcn components as building blocks
4. **Customize with Tailwind** - Match exact styles using Tailwind classes

## Design Token Mapping

### Colors

Update colors in `src/lib/design-tokens.ts`:

```typescript
colors: {
  brand: {
    DEFAULT: '#4736FE', // Copy hex from Figma
  }
}
```

Then use in components:
```tsx
<Button className="bg-brand text-white">Click me</Button>
```

### Spacing

Figma spacing → Tailwind classes:
- 4px → `p-1`, `gap-1`
- 8px → `p-2`, `gap-2`
- 16px → `p-4`, `gap-4`
- 24px → `p-6`, `gap-6`
- 32px → `p-8`, `gap-8`

### Typography

Figma text styles → Tailwind classes:
- Body text → `text-base` or `text-sm`
- Headings → `text-lg`, `text-xl`, `text-2xl`
- Font weights → `font-normal`, `font-medium`, `font-semibold`, `font-bold`

## Component Mapping

### Figma → shadcn Components

| Figma Component | shadcn Component | Example |
|-----------------|------------------|---------|
| Button | `Button` | `<Button>Click</Button>` |
| Input Field | `Input` | `<Input placeholder="..." />` |
| Card | `Card` | `<Card><CardHeader>...</CardHeader></Card>` |
| Modal/Dialog | `Dialog` | `<Dialog><DialogContent>...</DialogContent></Dialog>` |
| Dropdown | `Select` | `<Select><SelectTrigger>...</SelectTrigger></Select>` |
| Checkbox | `Checkbox` | `<Checkbox />` |
| Radio Group | `RadioGroup` | `<RadioGroup><RadioGroupItem /></RadioGroup>` |
| Form | `Form` | `<Form><FormField>...</FormField></Form>` |

## Step-by-Step Process

### 1. Analyze Figma Design

- Note component types (button, input, card, etc.)
- Extract colors (use Figma Dev Mode or inspect)
- Note spacing (padding, gaps, margins)
- Check typography (font size, weight, line height)
- Note border radius and shadows

### 2. Choose shadcn Component

Match Figma component to shadcn:
```tsx
import { Button } from '@/components/ui/button';
```

### 3. Apply Tailwind Classes

Match Figma styles with Tailwind:
```tsx
// Figma: Button with 16px padding, brand color, rounded corners
<Button className="px-4 py-4 bg-brand rounded-lg">
  Click me
</Button>
```

### 4. Customize Theme (if needed)

Update `src/app/globals.css` CSS variables:
```css
:root {
  --primary: 222.2 47.4% 11.2%; /* Update with your brand color */
}
```

## Common Patterns

### Card Component
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card className="p-6">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Form with Validation
```tsx
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

<Form>
  <FormField
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
      </FormItem>
    )}
  />
</Form>
```

### Modal/Dialog
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

<Dialog open={isOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    Content here
  </DialogContent>
</Dialog>
```

## Tips

1. **Use Figma Dev Mode** - Inspect exact spacing, colors, and measurements
2. **Start with shadcn base** - Customize from there, don't build from scratch
3. **Use Tailwind IntelliSense** - Get autocomplete for classes
4. **Test Responsively** - Use `sm:`, `md:`, `lg:` prefixes for breakpoints
5. **Match Spacing Scale** - Use Tailwind's spacing scale (4px increments)

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Figma Dev Mode](https://help.figma.com/hc/en-us/articles/360055204333)

