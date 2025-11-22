/**
 * Mobile Typography System
 * 
 * Strictly for mobile view only. These font styles should be used with Tailwind's
 * default (mobile-first) classes without sm: prefixes.
 * 
 * Usage:
 * - Mobile: Use these classes directly
 * - Desktop: Use sm: prefixed classes for desktop sizes
 * 
 * Example:
 * <h1 className={mobileTypography.heading20}>Title</h1>
 * <h2 className={`${mobileTypography.heading16} sm:text-2xl`}>Subtitle</h2>
 */

export const mobileTypography = {
  /**
   * Mobile/20M - H2
   * Font: Geist SemiBold (600)
   * Size: 20px
   * Letter Spacing: -0.75% (-0.15px)
   */
  h2: 'text-[20px] font-semibold leading-[28px] tracking-[-0.15px]',
  
  /**
   * Mobile/16M - H3
   * Font: Geist SemiBold (600)
   * Size: 16px
   * Letter Spacing: 0%
   */
  h3: 'text-[16px] font-semibold leading-[24px] tracking-[0px]',
  
  /**
   * Mobile/16 - H3
   * Font: Geist Regular (400)
   * Size: 16px
   * Letter Spacing: 0%
   */
  h3Regular: 'text-[16px] font-normal leading-[24px] tracking-[0px]',
  
  /**
   * Mobile/14 - Title
   * Font: Geist Regular (400)
   * Size: 14px
   * Letter Spacing: 0%
   */
  title14: 'text-[14px] font-normal leading-[20px] tracking-[0px]',
  
  /**
   * Mobile/14B - Title
   * Font: Geist SemiBold (600)
   * Size: 14px
   * Letter Spacing: 0%
   */
  title14Bold: 'text-[14px] font-semibold leading-[20px] tracking-[0px]',
  
  /**
   * Mobile/12- Body
   * Font: Geist Regular (400)
   * Size: 12px
   * Letter Spacing: 0%
   */
  body12: 'text-[12px] font-normal leading-[18px] tracking-[0px]',
  
  /**
   * Mobile/12B- Body
   * Font: Geist Medium (500)
   * Size: 12px
   * Letter Spacing: 0%
   */
  body12Medium: 'text-[12px] font-medium leading-[18px] tracking-[0px]',
  
  /**
   * Mobile/10 - cap
   * Font: Geist Regular (400)
   * Size: 10px
   * Letter Spacing: 0%
   */
  cap10: 'text-[10px] font-normal leading-[14px] tracking-[0px]',
  
  // Legacy aliases for backward compatibility
  heading20: 'text-[20px] font-semibold leading-[28px] tracking-[-0.15px]',
  heading16: 'text-[16px] font-semibold leading-[24px] tracking-[0px]',
  body16: 'text-[16px] font-normal leading-[24px] tracking-[0px]',
  small10: 'text-[10px] font-normal leading-[14px] tracking-[0px]',
} as const;

/**
 * Mobile Typography Styles (for inline style prop)
 * Use these when you need guaranteed font sizes via inline styles
 */
export const mobileTypographyStyles = {
  h2: { fontSize: '20px', fontWeight: 600, lineHeight: '28px', letterSpacing: '-0.15px' },
  h3: { fontSize: '16px', fontWeight: 600, lineHeight: '24px', letterSpacing: '0px' },
  h3Regular: { fontSize: '16px', fontWeight: 400, lineHeight: '24px', letterSpacing: '0px' },
  title14: { fontSize: '14px', fontWeight: 400, lineHeight: '20px', letterSpacing: '0px' },
  title14Bold: { fontSize: '14px', fontWeight: 600, lineHeight: '20px', letterSpacing: '0px' },
  body12: { fontSize: '12px', fontWeight: 400, lineHeight: '18px', letterSpacing: '0px' },
  body12Medium: { fontSize: '12px', fontWeight: 500, lineHeight: '18px', letterSpacing: '0px' },
  cap10: { fontSize: '10px', fontWeight: 400, lineHeight: '14px', letterSpacing: '0px' },
} as const;

/**
 * Mobile Typography with Font Family
 * Use these when you need to explicitly set the Geist font family
 */
export const mobileTypographyWithFont = {
  h2: `${mobileTypography.h2} font-['Geist',sans-serif]`,
  h3: `${mobileTypography.h3} font-['Geist',sans-serif]`,
  h3Regular: `${mobileTypography.h3Regular} font-['Geist',sans-serif]`,
  title14: `${mobileTypography.title14} font-['Geist',sans-serif]`,
  title14Bold: `${mobileTypography.title14Bold} font-['Geist',sans-serif]`,
  body12: `${mobileTypography.body12} font-['Geist',sans-serif]`,
  body12Medium: `${mobileTypography.body12Medium} font-['Geist',sans-serif]`,
  cap10: `${mobileTypography.cap10} font-['Geist',sans-serif]`,
  // Legacy aliases
  heading20: `${mobileTypography.heading20} font-['Geist',sans-serif]`,
  heading16: `${mobileTypography.heading16} font-['Geist',sans-serif]`,
  body16: `${mobileTypography.body16} font-['Geist',sans-serif]`,
  small10: `${mobileTypography.small10} font-['Geist',sans-serif]`,
} as const;

/**
 * Typography mapping for easy reference
 */
export const mobileTypographyMap = {
  'Mobile/20M - H2': mobileTypography.h2,
  'Mobile/16M - H3': mobileTypography.h3,
  'Mobile/16 - H3': mobileTypography.h3Regular,
  'Mobile/14 - Title': mobileTypography.title14,
  'Mobile/14B - Title': mobileTypography.title14Bold,
  'Mobile/12- Body': mobileTypography.body12,
  'Mobile/12B- Body': mobileTypography.body12Medium,
  'Mobile/10 - cap': mobileTypography.cap10,
  // Legacy mappings
  '20M-headings': mobileTypography.heading20,
  '16M-headings': mobileTypography.heading16,
  '16-normal': mobileTypography.body16,
  '14-title': mobileTypography.title14,
  '14B-title': mobileTypography.title14Bold,
  '12-body': mobileTypography.body12,
  '12B-body': mobileTypography.body12Medium,
  '10': mobileTypography.small10,
} as const;

