# E-commerce Database Schema & Seeding Guide

This guide covers the complete database setup for an e-commerce website with support for multiple subcategories with different product attributes.

## Overview

The database supports products with different attribute sets based on their subcategory:
- **Mobiles**: brand, ram, storage, battery, camera, display, os (7 attributes)
- **Apparel**: size, color, fabric, gender (4 attributes)

## Database Schema

### Tables Created

1. **categories** - Main product categories
2. **subcategories** - Subcategories under main categories
3. **products** - Base product information
4. **product_mobile_details** - Mobile-specific attributes
5. **product_apparel_details** - Apparel-specific attributes

### Key Features

- All tables use `UUID` primary keys with `gen_random_uuid()`
- Automatic `created_at` and `updated_at` timestamps
- Foreign keys with `ON DELETE CASCADE` for data integrity
- Triggers to auto-update `updated_at` on record changes
- Indexes on foreign keys for better query performance

## Setup Instructions

### 1. Run Schema Script

Execute the SQL schema file in your Supabase SQL Editor:

```bash
# Copy the contents of database-schema.sql and run in Supabase SQL Editor
```

Or use the Supabase CLI:

```bash
supabase db reset
supabase db push
```

### 2. Seed Data

1. Install dependencies:
```bash
npm install @supabase/supabase-js
npm install -D tsx  # or ts-node
```

2. Create `.env` file (copy from `.env.example`):
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the seed script:
```bash
npm run seed
# or
tsx scripts/seed.ts
```

## Example Queries

### Fetch All Mobiles with Details

```sql
SELECT 
    p.id,
    p.name,
    p.price,
    s.name AS subcategory_name,
    md.brand,
    md.ram,
    md.storage,
    md.battery,
    md.camera,
    md.display,
    md.os
FROM products p
INNER JOIN subcategories s ON p.subcategory_id = s.id
INNER JOIN product_mobile_details md ON p.id = md.product_id
WHERE s.slug = 'mobiles'
ORDER BY p.created_at DESC;
```

### Fetch All Apparel with Details

```sql
SELECT 
    p.id,
    p.name,
    p.price,
    s.name AS subcategory_name,
    ad.size,
    ad.color,
    ad.fabric,
    ad.gender
FROM products p
INNER JOIN subcategories s ON p.subcategory_id = s.id
INNER JOIN product_apparel_details ad ON p.id = ad.product_id
WHERE s.slug = 'apparel'
ORDER BY p.created_at DESC;
```

### Fetch Products by Category

```sql
SELECT 
    p.id,
    p.name,
    p.price,
    s.name AS subcategory_name,
    c.name AS category_name
FROM products p
INNER JOIN subcategories s ON p.subcategory_id = s.id
INNER JOIN categories c ON s.parent_category_id = c.id
WHERE c.name = 'Electronics'
  AND p.is_active = true
ORDER BY p.created_at DESC;
```

## TypeScript Usage

The seed script includes example functions that demonstrate how to:

1. Insert categories, subcategories, and products
2. Insert product detail records
3. Fetch products with their details using Supabase joins
4. Query products by category name

### Using in Your Application

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Fetch mobiles
const { data: mobiles } = await supabase
  .from('products')
  .select(`
    *,
    subcategories!inner (slug),
    product_mobile_details (*)
  `)
  .eq('subcategories.slug', 'mobiles');

// Fetch apparel
const { data: apparel } = await supabase
  .from('products')
  .select(`
    *,
    subcategories!inner (slug),
    product_apparel_details (*)
  `)
  .eq('subcategories.slug', 'apparel');
```

## Adding New Product Types

To add a new product type (e.g., "Laptops"):

1. Create a new detail table:
```sql
CREATE TABLE product_laptop_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    processor VARCHAR(100) NOT NULL,
    ram VARCHAR(50) NOT NULL,
    storage VARCHAR(50) NOT NULL,
    graphics VARCHAR(100) NOT NULL,
    screen_size VARCHAR(50) NOT NULL,
    os VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

2. Update your TypeScript types and seed script accordingly.

## Notes

- All foreign keys use `ON DELETE CASCADE` to ensure data integrity
- The `updated_at` column is automatically managed by database triggers
- Indexes are created on foreign keys for better query performance
- All tables include `is_active` flags for soft deletion support

