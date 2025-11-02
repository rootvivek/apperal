# Category and Subcategory Setup

## Summary

I've updated your system to properly separate categories and subcategories into different tables.

### Files Created:

1. **`create-subcategories-table.sql`** - Creates the subcategories table with UUID foreign key
2. **`src/app/admin/subcategories/page.tsx`** - Admin page for managing subcategories

### Key Changes:

## Database Structure

### Categories Table (`categories`)
- Only stores **top-level categories**
- No parent-child relationships
- Columns: id, name, slug, description, image_url, created_at, updated_at

### Subcategories Table (`subcategories`)  
- Stores **all subcategories**
- Links to parent via `parent_category_id` (UUID foreign key)
- Columns: id, name, slug, description, image_url, parent_category_id, created_at, updated_at
- Foreign key: `parent_category_id → categories.id` (ON DELETE CASCADE)

## How to Set Up

### Step 1: Create Subcategories Table
Run `create-subcategories-table.sql` in Supabase SQL Editor

### Step 2: Fix Storage Policies
Run `fix-storage-policies.sql` to allow image uploads

### Step 3: Use Separate Pages
- **Categories**: Go to `/admin/categories` to manage top-level categories
- **Subcategories**: Go to `/admin/subcategories` to manage subcategories linked to categories

## Workflow

1. Create a Category (e.g., "Electronics")
2. Create Subcategories (e.g., "Mobile Phones" under "Electronics")
3. Subcategory uses UUID to link to parent category

## Image Upload Behavior

- **Categories**: Fixed filename `image.jpg`, old images deleted before upload
- **Subcategories**: Fixed filename `image.jpg`, old images deleted before upload  
- **Products**: Unique filenames, supports multiple images

## Next Steps

The categories page has some issues that need manual cleanup. You should:
1. Remove `parent_category_id` field from categories table
2. Or migrate existing subcategories to the subcategories table
3. Update the admin layout to include subcategories link

For now, use `/admin/subcategories` directly to manage subcategories.

