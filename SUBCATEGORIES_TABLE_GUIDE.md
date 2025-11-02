# Subcategories Table Setup

## Overview
This guide will help you create a separate `subcategories` table with a proper parent-child relationship to `categories` using UUID foreign keys.

## Quick Start

### 1. Run the SQL Script

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `create-subcategories-table.sql`
3. Click **Run**

This will:
- ✅ Create the `subcategories` table
- ✅ Set up UUID foreign key to `categories` table
- ✅ Create indexes for better performance
- ✅ Set up RLS policies
- ✅ Add auto-update triggers

## Table Structure

```sql
subcategories (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_category_id UUID → categories(id),  -- Foreign key relationship
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Parent-Child Relationship

### How it works:
- Each subcategory has a `parent_category_id` that references `categories.id`
- **ON DELETE CASCADE**: If you delete a category, all its subcategories are automatically deleted
- **UNIQUE constraint**: Prevents duplicate subcategory names under the same parent

### Example Structure:

```
Electronics (Category)
  ├── Mobile Phones (Subcategory - parent_category_id = Electronics.id)
  ├── Laptops (Subcategory - parent_category_id = Electronics.id)
  └── Accessories (Subcategory - parent_category_id = Electronics.id)

UGH Clothing (Category)
  ├── Mens Shirts (Subcategory - parent_category_id = Clothing.id)
  └── Womens Dresses (Subcategory - parent_category_id = Clothing.id)
```

## Creating Subcategories

### Via SQL:
```sql
INSERT INTO subcategories (name, slug, description, parent_category_id)
VALUES (
  'Mobile Phones',
  'mobile-phones',
  'Smartphones and mobile devices',
  'category-uuid-here'
);
```

### Via Application:
Use the admin panel at `/admin/subcategories` to create subcategories through the UI.

## Querying Subcategories

### Get all subcategories with their parents:
```sql
SELECT 
    s.*,
    c.name AS parent_category_name
FROM subcategories s
JOIN categories c ON s.parent_category_id = c.id;
```

### Get all subcategories for a specific category:
```sql
SELECT *
FROM subcategories
WHERE parent_category_id = 'your-category-id-here';
```

### Get all parent categories:
```sql
SELECT DISTINCT c.*
FROM categories c
WHERE c.id IN (SELECT parent_category_id FROM subcategories);
```

## Database Relationship

```
┌─────────────────┐
│   categories    │
├─────────────────┤
│ id (UUID)       │←──┐
│ name            │   │
│ slug            │   │
│ description     │   │
│ image_url       │   │
│ parent_cat_id   │   │
│ created_at      │   │
│ updated_at      │   │
└─────────────────┘   │
       ↑               │
       │               │ REFERENCES
       │               │
┌─────────────────┐   │
│ subcategories   │───┘
├─────────────────┤
│ id (UUID)       │
│ name            │
│ slug            │
│ description     │
│ image_url       │
│ parent_cat_id   │── Foreign key to categories.id
│ created_at      │
│ updated_at      │
└─────────────────┘
```

## Benefits of Separate Tables

✅ **Clear separation**: Categories and subcategories are separate entities  
✅ **Better organization**: Easier to query and manage  
✅ **Flexible structure**: Each can have different fields if needed  
✅ **Clean relationships**: Explicit foreign key constraints  
✅ **Cascade delete**: Deleting a category automatically removes its subcategories  

## Next Steps

After creating the table:
1. Set up storage policies (see `fix-storage-policies.sql`)
2. Create the admin UI (already created at `/admin/subcategories`)
3. Update your application to use both tables
4. Migrate any existing subcategories from the unified table

## Files Created

- `create-subcategories-table.sql` - Table creation script
- `SUBCATEGORIES_TABLE_GUIDE.md` - This documentation
- `src/app/admin/subcategories/page.tsx` - Admin management page

