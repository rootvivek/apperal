# How to Add New Product Detail Tables

This guide shows you how to add a new product detail table (e.g., Electronics, Books, etc.) following the same pattern as Mobile, Apparel, and Accessories.

## Step-by-Step Guide

### 1. Create the Database Table

Run this SQL in Supabase SQL Editor (replace `electronics` with your table name):

```sql
-- Product Electronics Details Table (Example)
CREATE TABLE IF NOT EXISTS product_electronics_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    power_consumption VARCHAR(100) NOT NULL,
    warranty VARCHAR(50) NOT NULL,
    voltage VARCHAR(50) NOT NULL,
    connectivity VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_product_electronics_details_product_id 
    ON product_electronics_details(product_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_product_electronics_details_updated_at 
    ON product_electronics_details;
CREATE TRIGGER update_product_electronics_details_updated_at 
    BEFORE UPDATE ON product_electronics_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Update TypeScript Types

Edit `src/utils/productDetailsMapping.ts`:

```typescript
// Add to ProductDetailType
export type ProductDetailType = 'mobile' | 'apparel' | 'accessories' | 'electronics' | 'none';

// Add to getDetailTableName function
case 'electronics':
  return 'product_electronics_details';

// Add interface
export interface ElectronicsDetails {
  power_consumption: string;
  warranty: string;
  voltage: string;
  connectivity: string;
}
```

### 3. Update Category Constraint

Run this SQL to allow the new type:

```sql
ALTER TABLE categories 
DROP CONSTRAINT IF EXISTS check_categories_detail_type;

ALTER TABLE categories 
ADD CONSTRAINT check_categories_detail_type 
CHECK (detail_type IS NULL OR detail_type IN ('mobile', 'apparel', 'accessories', 'electronics'));
```

### 4. Update Product Form

Edit `src/app/admin/products/new/page.tsx`:

1. **Add to imports:**
```typescript
import { ..., ElectronicsDetails } from '@/utils/productDetailsMapping';
```

2. **Add to ProductFormData interface:**
```typescript
electronicsDetails: Partial<ElectronicsDetails>;
```

3. **Add to formData initial state:**
```typescript
electronicsDetails: {},
```

4. **Add to detailType detection:**
```typescript
const detailType = selectedCategory?.detail_type === 'mobile' ? 'mobile' 
  : selectedCategory?.detail_type === 'apparel' ? 'apparel' 
  : selectedCategory?.detail_type === 'accessories' ? 'accessories'
  : selectedCategory?.detail_type === 'electronics' ? 'electronics'
  : 'none';
```

5. **Add auto-save logic:**
```typescript
else if (detailTypeFromDB === 'electronics') {
  const electronicsInsert = {
    product_id: productDataSingle.id,
    power_consumption: formData.electronicsDetails?.power_consumption || 'Not Specified',
    warranty: formData.electronicsDetails?.warranty || 'Not Specified',
    voltage: formData.electronicsDetails?.voltage || 'Not Specified',
    connectivity: formData.electronicsDetails?.connectivity || 'Not Specified',
  };
  
  const { data: existing } = await supabase
    .from('product_electronics_details')
    .select('id')
    .eq('product_id', productDataSingle.id)
    .single();
  
  if (existing) {
    await supabase.from('product_electronics_details').update(electronicsInsert).eq('id', existing.id);
  } else {
    await supabase.from('product_electronics_details').insert(electronicsInsert).select();
  }
}
```

6. **Add form fields UI:**
```tsx
{detailType === 'electronics' && (
  <div className="sm:col-span-2 border-t pt-6">
    <h3 className="text-lg font-medium text-gray-900 mb-4">Electronics Specifications</h3>
    {/* Add your form fields here */}
  </div>
)}
```

### 5. Update Category Dropdown

Edit `src/app/admin/categories/page.tsx`:

Add to the dropdown:
```tsx
<option value="electronics">Electronics Details → All products use product_electronics_details table</option>
```

### 6. Reset Form Fields

Make sure to reset the new details in `handleCategoryChange`:
```typescript
electronicsDetails: {},
```

## Pattern Summary

1. **Database**: Create table with `product_[name]_details` naming
2. **TypeScript**: Add type, interface, and mapping
3. **Category**: Add to dropdown and constraint
4. **Product Form**: Add fields, auto-save logic, and UI
5. **Reset**: Include in form resets

That's it! The system will automatically detect and use your new detail table based on the category's `detail_type`.

