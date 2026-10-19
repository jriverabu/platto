// Identidad visual de Platto en la app: los mismos valores que la web (packages/core/src/brand.ts).
import { COLORS, RADII } from '@platto/core';

export const C = {
  ...COLORS,
  brandSoft: 'rgba(255, 90, 31, 0.14)',
  okBg: 'rgba(111, 208, 140, 0.14)',
  warnBg: 'rgba(255, 193, 90, 0.14)',
  badBg: 'rgba(255, 128, 112, 0.14)',
  glass: 'rgba(14, 14, 16, 0.55)',
} as const;

export const R = RADII;

/** Poppins por peso: en React Native cada peso es una familia distinta. */
export const F = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;
