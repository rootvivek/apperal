'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CarouselSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  buttonText: string;
  buttonLink: string;
  buttonTextSecondary?: string;
  buttonLinkSecondary?: string;
}

const carouselSlides: CarouselSlide[] = [
  {
    id: '1',
    title: 'New Collection',
    subtitle: 'Spring 2024',
    description: 'Discover our latest fashion trends with fresh designs and vibrant colors',
    image: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    buttonText: 'Shop Now',
    buttonLink: '/products',
    buttonTextSecondary: 'View Collection',
    buttonLinkSecondary: '/products/womens-clothing'
  },
  {
    id: '2',
    title: 'Men\'s Essentials',
    subtitle: 'Quality & Style',
    description: 'Elevate your wardrobe with our premium men\'s clothing collection',
    image: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    buttonText: 'Shop Men\'s',
    buttonLink: '/products/mens-clothing',
    buttonTextSecondary: 'Best Sellers',
    buttonLinkSecondary: '/products/mens-clothing/mens-tops'
  },
  {
    id: '3',
    title: 'Accessories',
    subtitle: 'Complete Your Look',
    description: 'From bags to jewelry, find the perfect accessories to complement your style',
    image: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    buttonText: 'Shop Accessories',
    buttonLink: '/products/accessories',
    buttonTextSecondary: 'New Arrivals',
    buttonLinkSecondary: '/products/accessories/bags'
  }
];

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
  };

  return (
    <div className="relative w-full h-[600px] overflow-hidden">
      {/* Carousel Slides */}
      <div className="relative w-full h-full">
        {carouselSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Background Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: slide.image.startsWith('linear-gradient') 
                  ? slide.image 
                  : `url(${slide.image})`,
                backgroundColor: slide.image.startsWith('linear-gradient') 
                  ? 'transparent' 
                  : '#1e40af' // Fallback color for images
              }}
            >
              <div 
                className="absolute inset-0 bg-black"
                style={{
                  opacity: slide.image.startsWith('linear-gradient') ? 0.2 : 0.4
                }}
              />
            </div>

            {/* Content */}
            <div className="relative z-10 flex items-center justify-center h-full">
              <div className="text-center text-white max-w-4xl mx-auto px-4">
                <div className="mb-4">
                  <span className="text-lg font-medium text-blue-200">{slide.subtitle}</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                  {slide.title}
                </h1>
                <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-2xl mx-auto">
                  {slide.description}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href={slide.buttonLink}
                    className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    {slide.buttonText}
                  </Link>
                  {slide.buttonTextSecondary && slide.buttonLinkSecondary && (
                    <Link
                      href={slide.buttonLinkSecondary}
                      className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                    >
                      {slide.buttonTextSecondary}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all"
        aria-label="Previous slide"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all"
        aria-label="Next slide"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
        {carouselSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide 
                ? 'bg-white' 
                : 'bg-white bg-opacity-50 hover:bg-opacity-75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
