# 🗄️ Database Setup Guide - Fix "Could not find the table" Error

## ❌ **Problem**
You're getting errors like:
- `Could not find the table 'public.categories' in the schema cache`
- `Could not find the table 'public.products' in the schema cache`

This means the database tables haven't been created in your Supabase project yet.

## ✅ **Solution: Run Database Schema**

### **Step 1: Access Supabase SQL Editor**

1. **Go to** [supabase.com](https://supabase.com)
2. **Login** to your account
3. **Select** your project (`ugzyijiuhchxbuiooclv`)
4. **Navigate** to **SQL Editor** (in the left sidebar)
5. **Click** "New Query"

### **Step 2: Run the Complete Schema**

Copy and paste this **entire SQL script** into the SQL Editor and click **"Run"**:

```sql
-- =============================================
-- Complete Apperal E-Commerce Database Schema
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_category_id);

-- =============================================
-- PRODUCTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  category VARCHAR(255),
  subcategory VARCHAR(255),
  image_url TEXT,
  brand VARCHAR(255),
  in_stock BOOLEAN DEFAULT true,
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for products
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- =============================================
-- USERS TABLE (extends Supabase auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(20),
  avatar_url TEXT,
  subscribe_newsletter BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  shipping_address JSONB,
  billing_address JSONB,
  payment_method VARCHAR(100),
  payment_status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- =============================================
-- ORDER ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  product_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for order items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- =============================================
-- CART ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

-- Indexes for cart items
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage categories" ON categories FOR ALL USING (auth.role() = 'authenticated');

-- Products policies
CREATE POLICY "Public can view active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated users can manage products" ON products FOR ALL USING (auth.role() = 'authenticated');

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Orders policies
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can manage orders" ON orders FOR ALL USING (auth.role() = 'authenticated');

-- Order items policies
CREATE POLICY "Users can view own order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Authenticated users can manage order items" ON order_items FOR ALL USING (auth.role() = 'authenticated');

-- Cart items policies
CREATE POLICY "Users can manage own cart" ON cart_items FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number = 'ORD-' || LPAD(nextval('order_number_seq')::text, 6, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- Trigger for order number generation
CREATE TRIGGER generate_order_number_trigger BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert sample categories
INSERT INTO categories (name, slug, description) VALUES 
('Men''s Clothing', 'mens-clothing', 'Clothing and apparel for men'),
('Women''s Clothing', 'womens-clothing', 'Clothing and apparel for women'),
('Accessories', 'accessories', 'Fashion accessories and add-ons'),
('Kids'' Clothing', 'kids-clothing', 'Clothing and apparel for children')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample products
INSERT INTO products (
  name, slug, description, price, category, subcategory, 
  image_url, stock_quantity, is_active
) VALUES 
(
  'Classic Cotton T-Shirt',
  'classic-cotton-t-shirt',
  'Comfortable 100% cotton t-shirt perfect for everyday wear. Available in multiple colors.',
  24.99,
  'Men''s Clothing',
  'Tops & T-Shirts',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
  50,
  true
),
(
  'Elegant Summer Dress',
  'elegant-summer-dress',
  'Light and breezy summer dress perfect for warm weather. Features a flattering A-line silhouette.',
  89.99,
  'Women''s Clothing',
  'Dresses',
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400',
  25,
  true
),
(
  'Leather Crossbody Bag',
  'leather-crossbody-bag',
  'Stylish leather crossbody bag with adjustable strap. Perfect for daily use.',
  79.99,
  'Accessories',
  'Bags & Purses',
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
  30,
  true
),
(
  'Kids'' Colorful Hoodie',
  'kids-colorful-hoodie',
  'Soft and comfortable hoodie for kids. Features fun colors and a cozy fleece lining.',
  39.99,
  'Kids'' Clothing',
  'Tops',
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
  40,
  true
),
(
  'Denim Jacket',
  'denim-jacket',
  'Classic denim jacket with a modern fit. Perfect for layering in any season.',
  69.99,
  'Men''s Clothing',
  'Jackets & Coats',
  'https://images.unsplash.com/photo-1544022613-e87ca75a784f?w=400',
  35,
  true
)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- GRANTS
-- =============================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================
SELECT 'Database schema created successfully! All tables, indexes, policies, and sample data are ready.' as message;
```

### **Step 3: Verify Setup**

After running the SQL script, you should see:
- ✅ **Success message**: "Database schema created successfully!"
- ✅ **All tables created**: categories, products, user_profiles, orders, etc.
- ✅ **Sample data inserted**: Categories and products for testing
- ✅ **RLS policies enabled**: Security configured

### **Step 4: Test Your Admin Panel**

1. **Visit** `http://localhost:3000/admin`
2. **Login** with `rootvivek@gmail.com`
3. **Check** that products and categories load without errors
4. **Try** adding a new product

## 🔧 **If You Still Get Errors**

### **Check Table Existence**
Run this query in Supabase SQL Editor to verify tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### **Check RLS Policies**
Run this query to verify policies are enabled:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

## 🎯 **Expected Results**

After running the schema, you should have:
- ✅ **8 tables** created (categories, products, user_profiles, orders, order_items, cart_items, etc.)
- ✅ **Sample data** for testing
- ✅ **Admin panel** working without errors
- ✅ **Product management** fully functional
- ✅ **Category management** working

## 🚀 **Next Steps**

1. **Run the SQL script** in Supabase
2. **Test the admin panel** at `/admin`
3. **Add your own products** using the admin interface
4. **Manage categories** as needed

Your admin panel will work perfectly once the database tables are created! 🎉
