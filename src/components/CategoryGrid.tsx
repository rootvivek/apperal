import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url?: string;
  image?: string;
}

interface CategoryGridProps {
  categories: Category[];
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/products/${category.slug}`}
          className="group relative overflow-hidden rounded-lg bg-white shadow-md hover:shadow-lg transition-shadow duration-300"
        >
          <div className="aspect-square overflow-hidden">
            <img
              src={category.image_url || category.image || '/images/categories/placeholder.svg'}
              alt={category.name}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/images/categories/placeholder.svg';
              }}
            />
          </div>
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
            <h3 className="text-white text-lg font-semibold mb-1">{category.name}</h3>
            <p className="text-white/90 text-sm">{category.description || 'Explore this category'}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
