import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './public/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#bf36ff',
        'on-primary': '#ffffff',
        surface: '#121414',
        'surface-dim': '#121414',
        'surface-bright': '#37393a',
        'surface-container-lowest': '#0c0f0f',
        'surface-container-low': '#1a1c1c',
        'surface-container': '#1e2020',
        'surface-container-high': '#282a2b',
        'surface-container-highest': '#333535',
        background: '#0B0B0F',
        'on-background': '#e2e2e2',
        'on-surface': '#e2e2e2',
        'on-surface-variant': '#d3c0d6',
        outline: '#9c8ba0',
        'outline-variant': '#504254',
        secondary: '#cac3dd',
        tertiary: '#cac1ea',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
      fontFamily: {
        headline: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
