/**
 * One self-hosted font family serves every application typography utility.
 * The font faces, including Vietnamese and italic, are declared in styles/fonts.css.
 */

export const fonts = {
  sans: { family: 'Inter', variable: '--font-sans' },
  mono: { family: 'Inter', variable: '--font-mono' },
  serif: { family: 'Inter', variable: '--font-serif' }
} as const;

// Legacy export - no longer needed since fonts are CSS-level
export const fontVariables = '';
