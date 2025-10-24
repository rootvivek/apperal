// Mock product data
import { Product, ProductCategory } from '@/types/product';

export const productCategories: ProductCategory[] = [
  {
    id: 'featured-products',
    name: 'Featured Products',
    slug: 'featured-products',
    description: 'Handpicked bestsellers and trending items',
    image: '/images/categories/featured-products.jpg',
    subcategories: [
      { id: 'featured-mens', name: 'Featured Men\'s Items', slug: 'featured-mens', parentCategory: 'featured-products' },
      { id: 'featured-womens', name: 'Featured Women\'s Items', slug: 'featured-womens', parentCategory: 'featured-products' },
      { id: 'featured-accessories', name: 'Featured Accessories', slug: 'featured-accessories', parentCategory: 'featured-products' },
    ]
  },
  {
    id: 'new-arrivals',
    name: 'New Arrivals',
    slug: 'new-arrivals',
    description: 'Latest additions to our collection',
    image: '/images/categories/new-arrivals.jpg',
    subcategories: [
      { id: 'new-mens', name: 'New Men\'s Items', slug: 'new-mens', parentCategory: 'new-arrivals' },
      { id: 'new-womens', name: 'New Women\'s Items', slug: 'new-womens', parentCategory: 'new-arrivals' },
      { id: 'new-accessories', name: 'New Accessories', slug: 'new-accessories', parentCategory: 'new-arrivals' },
    ]
  },
  {
    id: 'sale',
    name: 'Sale',
    slug: 'sale',
    description: 'Special offers and discounted items',
    image: '/images/categories/sale.jpg',
    subcategories: [
      { id: 'sale-mens', name: 'Men\'s Sale', slug: 'sale-mens', parentCategory: 'sale' },
      { id: 'sale-womens', name: 'Women\'s Sale', slug: 'sale-womens', parentCategory: 'sale' },
      { id: 'sale-accessories', name: 'Accessories Sale', slug: 'sale-accessories', parentCategory: 'sale' },
    ]
  },
  {
    id: 'best-sellers',
    name: 'Best Sellers',
    slug: 'best-sellers',
    description: 'Our most popular and highly rated products',
    image: '/images/categories/best-sellers.jpg',
    subcategories: [
      { id: 'bestseller-mens', name: 'Men\'s Best Sellers', slug: 'bestseller-mens', parentCategory: 'best-sellers' },
      { id: 'bestseller-womens', name: 'Women\'s Best Sellers', slug: 'bestseller-womens', parentCategory: 'best-sellers' },
      { id: 'bestseller-accessories', name: 'Accessories Best Sellers', slug: 'bestseller-accessories', parentCategory: 'best-sellers' },
    ]
  },
  {
    id: 'seasonal',
    name: 'Seasonal',
    slug: 'seasonal',
    description: 'Season-specific clothing and accessories',
    image: '/images/categories/seasonal.jpg',
    subcategories: [
      { id: 'spring-collection', name: 'Spring Collection', slug: 'spring-collection', parentCategory: 'seasonal' },
      { id: 'summer-collection', name: 'Summer Collection', slug: 'summer-collection', parentCategory: 'seasonal' },
      { id: 'fall-collection', name: 'Fall Collection', slug: 'fall-collection', parentCategory: 'seasonal' },
      { id: 'winter-collection', name: 'Winter Collection', slug: 'winter-collection', parentCategory: 'seasonal' },
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    slug: 'premium',
    description: 'High-end luxury items and exclusive collections',
    image: '/images/categories/premium.jpg',
    subcategories: [
      { id: 'premium-mens', name: 'Men\'s Premium', slug: 'premium-mens', parentCategory: 'premium' },
      { id: 'premium-womens', name: 'Women\'s Premium', slug: 'premium-womens', parentCategory: 'premium' },
      { id: 'premium-accessories', name: 'Premium Accessories', slug: 'premium-accessories', parentCategory: 'premium' },
    ]
  },
  {
    id: 'mens-clothing',
    name: "Men's Clothing",
    slug: 'mens-clothing',
    description: 'Stylish and comfortable clothing for men',
    image: '/images/categories/mens-clothing.jpg',
    subcategories: [
      { id: 'mens-tops', name: 'Tops & T-Shirts', slug: 'mens-tops', parentCategory: 'mens-clothing' },
      { id: 'mens-bottoms', name: 'Pants & Shorts', slug: 'mens-bottoms', parentCategory: 'mens-clothing' },
      { id: 'mens-outerwear', name: 'Jackets & Coats', slug: 'mens-outerwear', parentCategory: 'mens-clothing' },
      { id: 'mens-activewear', name: 'Activewear', slug: 'mens-activewear', parentCategory: 'mens-clothing' },
    ]
  },
  {
    id: 'womens-clothing',
    name: "Women's Clothing",
    slug: 'womens-clothing',
    description: 'Fashionable and elegant clothing for women',
    image: '/images/categories/womens-clothing.jpg',
    subcategories: [
      { id: 'womens-tops', name: 'Tops & Blouses', slug: 'womens-tops', parentCategory: 'womens-clothing' },
      { id: 'womens-dresses', name: 'Dresses', slug: 'womens-dresses', parentCategory: 'womens-clothing' },
      { id: 'womens-bottoms', name: 'Pants & Skirts', slug: 'womens-bottoms', parentCategory: 'womens-clothing' },
      { id: 'womens-outerwear', name: 'Jackets & Coats', slug: 'womens-outerwear', parentCategory: 'womens-clothing' },
    ]
  },
  {
    id: 'accessories',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Complete your look with our accessories',
    image: '/images/categories/accessories.jpg',
    subcategories: [
      { id: 'bags', name: 'Bags & Purses', slug: 'bags', parentCategory: 'accessories' },
      { id: 'jewelry', name: 'Jewelry', slug: 'jewelry', parentCategory: 'accessories' },
      { id: 'shoes', name: 'Shoes', slug: 'shoes', parentCategory: 'accessories' },
      { id: 'watches', name: 'Watches', slug: 'watches', parentCategory: 'accessories' },
    ]
  },
  {
    id: 'kids-clothing',
    name: "Kids' Clothing",
    slug: 'kids-clothing',
    description: 'Fun and comfortable clothing for kids',
    image: '/images/categories/kids-clothing.jpg',
    subcategories: [
      { id: 'kids-tops', name: 'Tops', slug: 'kids-tops', parentCategory: 'kids-clothing' },
      { id: 'kids-bottoms', name: 'Bottoms', slug: 'kids-bottoms', parentCategory: 'kids-clothing' },
      { id: 'kids-dresses', name: 'Dresses', slug: 'kids-dresses', parentCategory: 'kids-clothing' },
      { id: 'kids-shoes', name: 'Shoes', slug: 'kids-shoes', parentCategory: 'kids-clothing' },
    ]
  },
  {
    id: 'electronics',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Latest gadgets and electronic devices',
    image: '/images/categories/electronics.jpg',
    subcategories: [
      { id: 'smartphones', name: 'Smartphones', slug: 'smartphones', parentCategory: 'electronics' },
      { id: 'laptops', name: 'Laptops', slug: 'laptops', parentCategory: 'electronics' },
      { id: 'headphones', name: 'Headphones', slug: 'headphones', parentCategory: 'electronics' },
      { id: 'accessories-electronics', name: 'Electronics Accessories', slug: 'accessories-electronics', parentCategory: 'electronics' },
    ]
  },
  {
    id: 'mobile-covers',
    name: 'Mobile Covers',
    slug: 'mobile-covers',
    description: 'Protect your phone with our stylish covers',
    image: '/images/categories/mobile-covers.jpg',
    subcategories: [
      { id: 'iphone-covers', name: 'iPhone Covers', slug: 'iphone-covers', parentCategory: 'mobile-covers' },
      { id: 'samsung-covers', name: 'Samsung Covers', slug: 'samsung-covers', parentCategory: 'mobile-covers' },
      { id: 'universal-covers', name: 'Universal Covers', slug: 'universal-covers', parentCategory: 'mobile-covers' },
      { id: 'premium-covers', name: 'Premium Covers', slug: 'premium-covers', parentCategory: 'mobile-covers' },
    ]
  }
];

export const sampleProducts: Product[] = [
  // Featured Products
  {
    id: 'featured-premium-jacket-001',
    name: 'Premium Leather Jacket',
    description: 'Handcrafted genuine leather jacket with premium finishing',
    price: 299.99,
    originalPrice: 399.99,
    images: ['/images/products/leather-jacket-1.jpg', '/images/products/leather-jacket-2.jpg'],
    category: productCategories[0], // Featured Products
    subcategory: 'featured-mens',
    brand: 'Apperal',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Black', 'Brown', 'Tan'],
    inStock: true,
    rating: 4.9,
    reviewCount: 156,
    tags: ['featured', 'premium', 'leather', 'jacket'],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10')
  },
  {
    id: 'featured-designer-dress-001',
    name: 'Designer Evening Dress',
    description: 'Elegant designer dress perfect for special occasions',
    price: 199.99,
    originalPrice: 299.99,
    images: ['/images/products/evening-dress-1.jpg', '/images/products/evening-dress-2.jpg'],
    category: productCategories[0], // Featured Products
    subcategory: 'featured-womens',
    brand: 'Apperal',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Black', 'Navy', 'Burgundy'],
    inStock: true,
    rating: 4.8,
    reviewCount: 89,
    tags: ['featured', 'designer', 'evening', 'dress'],
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12')
  },
  // New Arrivals
  {
    id: 'new-tech-hoodie-001',
    name: 'Tech-Fabric Hoodie',
    description: 'Modern hoodie with moisture-wicking technology',
    price: 89.99,
    images: ['/images/products/tech-hoodie-1.jpg', '/images/products/tech-hoodie-2.jpg'],
    category: productCategories[1], // New Arrivals
    subcategory: 'new-mens',
    brand: 'Apperal',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Charcoal', 'Navy', 'Forest Green'],
    inStock: true,
    rating: 4.6,
    reviewCount: 23,
    tags: ['new', 'tech', 'hoodie', 'moisture-wicking'],
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01')
  },
  // Sale Items
  {
    id: 'sale-cotton-tshirt-001',
    name: 'Classic Cotton T-Shirt',
    description: 'Comfortable 100% cotton t-shirt perfect for everyday wear',
    price: 19.99,
    originalPrice: 39.99,
    images: ['/images/products/mens-tshirt-1.jpg', '/images/products/mens-tshirt-2.jpg'],
    category: productCategories[2], // Sale
    subcategory: 'sale-mens',
    brand: 'Apperal',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['White', 'Black', 'Navy', 'Gray'],
    inStock: true,
    rating: 4.5,
    reviewCount: 128,
    tags: ['sale', 'cotton', 'casual', 'basic'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  // Best Sellers
  {
    id: 'bestseller-summer-dress-001',
    name: 'Summer Floral Dress',
    description: 'Lightweight floral dress perfect for summer occasions',
    price: 79.99,
    images: ['/images/products/womens-dress-1.jpg', '/images/products/womens-dress-2.jpg'],
    category: productCategories[3], // Best Sellers
    subcategory: 'bestseller-womens',
    brand: 'Apperal',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Floral Blue', 'Floral Pink', 'Floral Green'],
    inStock: true,
    rating: 4.8,
    reviewCount: 95,
    tags: ['bestseller', 'summer', 'floral', 'dress'],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  },
  // Seasonal
  {
    id: 'spring-light-jacket-001',
    name: 'Spring Light Jacket',
    description: 'Lightweight jacket perfect for spring weather',
    price: 129.99,
    images: ['/images/products/spring-jacket-1.jpg', '/images/products/spring-jacket-2.jpg'],
    category: productCategories[4], // Seasonal
    subcategory: 'spring-collection',
    brand: 'Apperal',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Light Blue', 'Pink', 'Mint Green'],
    inStock: true,
    rating: 4.7,
    reviewCount: 67,
    tags: ['spring', 'lightweight', 'jacket', 'seasonal'],
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15')
  },
  // Premium
  {
    id: 'premium-leather-handbag-001',
    name: 'Premium Leather Handbag',
    description: 'Handcrafted genuine leather handbag with elegant design',
    price: 199.99,
    originalPrice: 249.99,
    images: ['/images/products/handbag-1.jpg', '/images/products/handbag-2.jpg'],
    category: productCategories[5], // Premium
    subcategory: 'premium-accessories',
    brand: 'Apperal',
    sizes: ['One Size'],
    colors: ['Brown', 'Black', 'Tan'],
    inStock: true,
    rating: 4.7,
    reviewCount: 67,
    tags: ['premium', 'leather', 'handbag', 'luxury'],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  },
  // Electronics
  {
    id: 'smartphone-latest-001',
    name: 'Latest Smartphone',
    description: 'High-performance smartphone with advanced features',
    price: 699.99,
    originalPrice: 799.99,
    images: ['/images/products/smartphone-1.jpg', '/images/products/smartphone-2.jpg'],
    category: productCategories[10], // Electronics
    subcategory: 'smartphones',
    brand: 'TechBrand',
    sizes: ['128GB', '256GB', '512GB'],
    colors: ['Black', 'White', 'Blue'],
    inStock: true,
    rating: 4.8,
    reviewCount: 234,
    tags: ['smartphone', 'electronics', 'mobile', 'tech'],
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10')
  },
  {
    id: 'gaming-laptop-001',
    name: 'Gaming Laptop',
    description: 'High-performance gaming laptop with RTX graphics',
    price: 1299.99,
    originalPrice: 1499.99,
    images: ['/images/products/laptop-1.jpg', '/images/products/laptop-2.jpg'],
    category: productCategories[10], // Electronics
    subcategory: 'laptops',
    brand: 'GameTech',
    sizes: ['16GB RAM', '32GB RAM'],
    colors: ['Black', 'RGB'],
    inStock: true,
    rating: 4.9,
    reviewCount: 156,
    tags: ['laptop', 'gaming', 'electronics', 'performance'],
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-05')
  },
  {
    id: 'wireless-headphones-001',
    name: 'Wireless Headphones',
    description: 'Premium wireless headphones with noise cancellation',
    price: 199.99,
    originalPrice: 249.99,
    images: ['/images/products/headphones-1.jpg', '/images/products/headphones-2.jpg'],
    category: productCategories[10], // Electronics
    subcategory: 'headphones',
    brand: 'AudioPro',
    sizes: ['One Size'],
    colors: ['Black', 'White', 'Blue'],
    inStock: true,
    rating: 4.7,
    reviewCount: 89,
    tags: ['headphones', 'wireless', 'electronics', 'audio'],
    createdAt: new Date('2024-02-08'),
    updatedAt: new Date('2024-02-08')
  },
  // Mobile Covers
  {
    id: 'iphone-15-cover-001',
    name: 'iPhone 15 Premium Cover',
    description: 'Protective cover for iPhone 15 with premium materials',
    price: 29.99,
    originalPrice: 39.99,
    images: ['/images/products/iphone-cover-1.jpg', '/images/products/iphone-cover-2.jpg'],
    category: productCategories[11], // Mobile Covers
    subcategory: 'iphone-covers',
    brand: 'CoverPro',
    sizes: ['iPhone 15', 'iPhone 15 Plus'],
    colors: ['Clear', 'Black', 'Blue', 'Pink'],
    inStock: true,
    rating: 4.6,
    reviewCount: 178,
    tags: ['iphone', 'cover', 'protection', 'mobile'],
    createdAt: new Date('2024-02-12'),
    updatedAt: new Date('2024-02-12')
  },
  {
    id: 'samsung-galaxy-cover-001',
    name: 'Samsung Galaxy Cover',
    description: 'Durable cover for Samsung Galaxy series',
    price: 24.99,
    originalPrice: 34.99,
    images: ['/images/products/samsung-cover-1.jpg', '/images/products/samsung-cover-2.jpg'],
    category: productCategories[11], // Mobile Covers
    subcategory: 'samsung-covers',
    brand: 'CoverPro',
    sizes: ['Galaxy S24', 'Galaxy S24+', 'Galaxy S24 Ultra'],
    colors: ['Black', 'White', 'Green', 'Purple'],
    inStock: true,
    rating: 4.5,
    reviewCount: 142,
    tags: ['samsung', 'cover', 'protection', 'mobile'],
    createdAt: new Date('2024-02-14'),
    updatedAt: new Date('2024-02-14')
  },
  {
    id: 'universal-phone-cover-001',
    name: 'Universal Phone Cover',
    description: 'Flexible universal cover that fits most phone models',
    price: 19.99,
    originalPrice: 29.99,
    images: ['/images/products/universal-cover-1.jpg', '/images/products/universal-cover-2.jpg'],
    category: productCategories[11], // Mobile Covers
    subcategory: 'universal-covers',
    brand: 'CoverPro',
    sizes: ['Universal'],
    colors: ['Clear', 'Black', 'Transparent'],
    inStock: true,
    rating: 4.4,
    reviewCount: 95,
    tags: ['universal', 'cover', 'protection', 'mobile'],
    createdAt: new Date('2024-02-16'),
    updatedAt: new Date('2024-02-16')
  }
];
