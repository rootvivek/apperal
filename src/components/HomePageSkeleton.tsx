'use client';

export default function HomePageSkeleton() {
  return (
    <main className="min-h-screen bg-white pt-14 sm:pt-[72px]">

      {/* CategoryGrid Skeleton */}
      <section className="pb-3 bg-white mb-4">
        <div className="py-3 mx-3 sm:mx-6 lg:mx-8 hidden sm:flex sm:justify-center px-1.5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-5">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="flex flex-col items-center text-center w-[100px]">
                <div className="w-[100px] aspect-square bg-gray-200 animate-pulse rounded-lg mb-2 shadow-sm"></div>
                <div className="h-4 w-20 bg-gray-200 animate-pulse rounded mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile Subcategories Skeleton */}
      <div className="md:hidden bg-white border-t border-gray-100 min-h-[180px]">
        <div className="pl-2.5 pr-2.5 pt-1 -mb-12">
          <div className="grid grid-cols-5 gap-1.5">
            {[...Array(10)].map((_, index) => (
              <div key={index} className="flex flex-col items-center text-center group">
                <div className="w-full h-20 sm:h-24 overflow-hidden rounded-[2px] mb-1.5 shadow-sm bg-gray-200 animate-pulse"></div>
                <span className="text-[11px] sm:text-[12px] bg-gray-200 animate-pulse rounded h-[14px] w-3/4 block"></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Carousel Skeleton */}
      <div className="w-full h-[50vh] bg-gray-200 animate-pulse">
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading featured products...</p>
          </div>
        </div>
      </div>

      {/* All Products Section Skeleton */}
      <section className="py-8 bg-white">
        <div className="w-full px-1.5 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="h-8 w-40 bg-gray-200 animate-pulse rounded mx-auto"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(12)].map((_, index) => (
              <div key={index} className="bg-white rounded-lg overflow-hidden">
                <div className="aspect-[4/5] bg-gray-200 animate-pulse"></div>
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Category Sections Skeleton */}
      {[...Array(3)].map((_, sectionIndex) => (
        <section key={sectionIndex} className="py-16 bg-white">
          <div className="w-full px-1.5 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mx-auto"></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="bg-white rounded-lg overflow-hidden">
                  <div className="aspect-[4/5] bg-gray-200 animate-pulse"></div>
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}

