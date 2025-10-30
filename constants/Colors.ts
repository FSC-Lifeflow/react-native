/**
 * LifeFlow Design System - Colors
 * Converted from HSL to RGB for React Native compatibility
 * Based on frontend/src/index.css
 */

// Helper function to convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));
  return `rgb(${r}, ${g}, ${b})`;
}

export const Colors = {
  light: {
    // Base colors
    background: hslToRgb(120, 20, 98), // Soft sage background
    foreground: hslToRgb(150, 25, 15), // Deep forest text
    
    // Card colors
    card: '#FFFFFF',
    cardForeground: hslToRgb(150, 25, 15),
    
    // Primary - Sage green
    primary: hslToRgb(95, 25, 45), // #6B8E5F
    primaryForeground: '#FFFFFF',
    primaryGlow: hslToRgb(95, 35, 60),
    
    // Secondary - Warm coral for motivation
    secondary: hslToRgb(8, 100, 75), // #FF9980
    secondaryForeground: '#FFFFFF',
    
    // Muted - Soft wellness grays
    muted: hslToRgb(120, 10, 96),
    mutedForeground: hslToRgb(150, 15, 45),
    
    // Accent
    accent: hslToRgb(8, 100, 75),
    accentForeground: '#FFFFFF',
    
    // Destructive
    destructive: hslToRgb(0, 84.2, 60.2),
    destructiveForeground: hslToRgb(210, 40, 98),
    
    // Border & Input
    border: hslToRgb(120, 15, 88),
    input: hslToRgb(120, 15, 88),
    ring: hslToRgb(95, 25, 45),
    
    // Tab bar
    tint: hslToRgb(95, 25, 45),
    tabIconDefault: hslToRgb(150, 15, 45),
    tabIconSelected: hslToRgb(95, 25, 45),
  },
  dark: {
    // Base colors
    background: hslToRgb(150, 15, 12),
    foreground: hslToRgb(120, 20, 95),
    
    // Card colors
    card: hslToRgb(150, 12, 18),
    cardForeground: hslToRgb(120, 20, 95),
    
    // Primary - Brighter sage for dark mode
    primary: hslToRgb(95, 35, 60),
    primaryForeground: hslToRgb(150, 25, 8),
    primaryGlow: hslToRgb(95, 45, 70),
    
    // Secondary - Softer coral for dark mode
    secondary: hslToRgb(8, 85, 65),
    secondaryForeground: '#FFFFFF',
    
    // Muted
    muted: hslToRgb(150, 15, 22),
    mutedForeground: hslToRgb(120, 15, 70),
    
    // Accent
    accent: hslToRgb(8, 85, 65),
    accentForeground: '#FFFFFF',
    
    // Destructive
    destructive: hslToRgb(0, 75, 55),
    destructiveForeground: hslToRgb(210, 40, 98),
    
    // Border & Input
    border: hslToRgb(150, 15, 25),
    input: hslToRgb(150, 15, 25),
    ring: hslToRgb(95, 35, 60),
    
    // Tab bar
    tint: hslToRgb(95, 35, 60),
    tabIconDefault: hslToRgb(120, 15, 70),
    tabIconSelected: hslToRgb(95, 35, 60),
  },
};

// Gradient definitions (for use with react-native-linear-gradient if needed)
export const Gradients = {
  light: {
    primary: [hslToRgb(95, 25, 45), hslToRgb(95, 35, 60)],
    wellness: [hslToRgb(120, 20, 98), hslToRgb(120, 25, 92)],
    motivation: [hslToRgb(8, 100, 75), hslToRgb(8, 90, 80)],
  },
  dark: {
    primary: [hslToRgb(95, 35, 60), hslToRgb(95, 45, 70)],
    wellness: [hslToRgb(150, 15, 14), hslToRgb(150, 12, 20)],
    motivation: [hslToRgb(8, 85, 65), hslToRgb(8, 75, 70)],
  },
};

// Shadow definitions
export const Shadows = {
  light: {
    wellness: {
      shadowColor: hslToRgb(95, 25, 45),
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 4,
    },
    card: {
      shadowColor: hslToRgb(150, 25, 15),
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 2,
    },
    glow: {
      shadowColor: hslToRgb(95, 35, 60),
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 30,
      elevation: 8,
    },
  },
  dark: {
    wellness: {
      shadowColor: hslToRgb(95, 35, 60),
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 4,
    },
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 2,
    },
    glow: {
      shadowColor: hslToRgb(95, 45, 70),
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 30,
      elevation: 8,
    },
  },
};

// Typography
export const Typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing (matches Tailwind's spacing scale)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

// Border radius
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Animation durations (in milliseconds)
export const Animations = {
  fast: 150,
  normal: 300,
  slow: 500,
  // Cubic bezier for wellness transitions: cubic-bezier(0.4, 0, 0.2, 1)
  easing: {
    easeOut: 'ease-out',
    easeIn: 'ease-in',
    easeInOut: 'ease-in-out',
  },
};
