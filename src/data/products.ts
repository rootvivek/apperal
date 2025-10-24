// Mock product data
import { Product, ProductCategory } from '@/types/product';

export const productCategories: ProductCategory[] = [
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
  }
];

export const sampleProducts: Product[] = [
  {
    id: 'mens-cotton-tshirt-001',
    name: 'Classic Cotton T-Shirt',
    description: 'Comfortable 100% cotton t-shirt perfect for everyday wear',
    price: 29.99,
    originalPrice: 39.99,
    images: ['/images/products/mens-tshirt-1.jpg', '/images/products/mens-tshirt-2.jpg'],
    category: productCategories[0],
    subcategory: 'mens-tops',
    brand: 'Apperal',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['White', 'Black', 'Navy', 'Gray'],
    inStock: true,
    rating: 4.5,
    reviewCount: 128,
    tags: ['cotton', 'casual', 'basic'],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'womens-summer-dress-001',
    name: 'Summer Floral Dress',
    description: 'Lightweight floral dress perfect for summer occasions',
    price: 79.99,
    images: ['/images/products/womens-dress-1.jpg', '/images/products/womens-dress-2.jpg'],
    category: productCategories[1],
    subcategory: 'womens-dresses',
    brand: 'Apperal',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Floral Blue', 'Floral Pink', 'Floral Green'],
    inStock: true,
    rating: 4.8,
    reviewCount: 95,
    tags: ['summer', 'floral', 'dress'],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  },
  {
    id: 'leather-handbag-001',
    name: 'Premium Leather Handbag',
    description: 'Handcrafted genuine leather handbag with elegant design',
    price: 199.99,
    originalPrice: 249.99,
    images: ['/images/products/handbag-1.jpg', '/images/products/handbag-2.jpg'],
    category: productCategories[2],
    subcategory: 'bags',
    brand: 'Apperal',
    sizes: ['One Size'],
    colors: ['Brown', 'Black', 'Tan'],
    inStock: true,
    rating: 4.7,
    reviewCount: 67,
    tags: ['leather', 'handbag', 'premium'],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  }
];
