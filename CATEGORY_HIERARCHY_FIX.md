# Category Hierarchy - Database Link Enforcement

This document explains how the category-subcategory relationships are enforced in both the database and the frontend.

## Problem
Subcategories need to always have a proper parent category linked in the database to maintain a valid hierarchical structure.

## Solution

### 1. Database Constraints (`enforce-category-relationships.sql`)

Run this SQL script in your Supabase SQL Editor to enforce proper relationships:

#### Key Features:
- **Foreign Key Constraint**: Ensures `parent_category_id` references a valid category ID
- **Cascade Delete**: When a parent category is deleted, all its subcategories are deleted too
- **No Self-Reference**: Prevents a category from being its own parent
- **Circular Reference Prevention**: Function and trigger prevent circular parent-child relationships

#### Helper Functions Created:
1. `get_category_descendants(category_uuid)` - Gets all subcategories of a category
2. `get_category_ancestors(category_uuid)` - Gets all parent categories
3. `category_hierarchy` view - Shows the complete hierarchy tree

#### Example Usage:
```sql
-- Get all subcategories
SELECT * FROM get_category_descendants('category-id-here');

-- View full hierarchy
SELECT * FROM category_hierarchy ORDER BY path;

-- Check for orphaned subcategories
SELECT * FROM categories 
WHERE parent_category_id IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM categories AS parent
  WHERE parent.id = categories.parent_category_id
);
```

### 2. Frontend Validation (`src/app/admin/categories/page.tsx`)

#### Improvements Made:

**A. Parent Selection Dropdown**
- Only shows **top-level categories** (categories without parents)
- Prevents subcategories from being selected as parents
- Excludes current category when editing to prevent self-reference

**B. Form Validation**
- Validates that parent category exists before submission
- Prevents circular references
- Ensures category name is provided

**C. Visual Hierarchy**
- Categories are displayed in a tree structure
- Subcategories appear indented under their parents
- Hierarchical ordering maintained in the table view

### 3. Database Schema

The categories table structure:
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Key Points:**
- `parent_category_id` is nullable (NULL = top-level category)
- Foreign key links to `categories(id)`
- `ON DELETE CASCADE` ensures subcategories are deleted when parent is deleted

## How to Use

### Creating a Top-Level Category
1. Go to Admin → Categories
2. Click "Add Category"
3. Enter category name and details
4. Leave "Parent Category" as "None (Top-level)"
5. Save

### Creating a Subcategory
1. Go to Admin → Categories
2. Click "Add Subcategory" under the parent category
   - OR click "Add Category" and select a parent from dropdown
3. Enter subcategory name and details
4. Select the parent category
5. Save

### Validation Rules
✅ **Allowed:**
- Top-level categories with no parent
- Subcategories with valid parent
- Editing subcategory to change parent (must be a top-level category)

❌ **Not Allowed:**
- Subcategory as a parent of another category
- Category as its own parent
- Circular references
- Invalid parent_category_id

## Testing

### 1. Test Valid Hierarchy
```
Electronics (top-level)
  ├── Mobile Phones (subcategory)
  └── Laptops (subcategory)
```

### 2. Test Invalid Operations
- Try to select a subcategory as parent → Should not appear in dropdown
- Try to set category as its own parent → Validation error
- Try to create orphaned subcategory → Parent validation error

### 3. Test Cascade Delete
- Delete a parent category
- Verify all subcategories are deleted too

## Troubleshooting

### Issue: "Circular reference detected" error
**Cause:** Trying to create a circular parent-child relationship
**Solution:** The database trigger prevents this automatically

### Issue: Subcategory shows in parent dropdown
**Cause:** Frontend filtering not working
**Solution:** Check that parent_category_id filter is applied

### Issue: Can't delete category
**Cause:** Category might have products or subcategories
**Solution:** Delete subcategories first, or handle cascade delete

## Files Modified

1. `enforce-category-relationships.sql` - Database constraints and functions
2. `src/app/admin/categories/page.tsx` - Frontend validation and UI improvements
3. `CATEGORY_HIERARCHY_FIX.md` - This documentation

## Next Steps

After running the SQL script:
1. ✅ Database enforces proper relationships
2. ✅ Frontend validates parent selection
3. ✅ UI shows only valid parent options
4. ✅ Circular references are prevented
5. ✅ Cascade delete works properly

Your category hierarchy is now properly enforced and linked in the database!

