# Hero Images Directory

This directory contains hero images for the carousel.

## Current Status
The hero carousel now uses beautiful gradient backgrounds instead of images to avoid 404 errors.

## Gradient Backgrounds Used:
- Spring Collection: Purple to blue gradient
- Men's Essentials: Pink to red gradient  
- Accessories: Blue to cyan gradient

## Adding Real Images
If you want to use real images instead of gradients:

1. Add your images to this directory
2. Update the `carouselSlides` array in `src/components/HeroCarousel.tsx`
3. Change the `image` property from gradient to image path

Example:
```typescript
image: '/images/hero/spring-collection.jpg'
```
