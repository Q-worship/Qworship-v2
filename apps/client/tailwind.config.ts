/** @type {import('tailwindcss').Config} */
import animatePlugin from "tailwindcss-animate";
import typographyPlugin from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // --- Existing dashboard HSL tokens ---
        codelytemplatewebflowionero: "var(--codelytemplatewebflowionero)",
        codelytemplatewebflowiowoodsmoke: "var(--codelytemplatewebflowiowoodsmoke)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // --- Marketing design tokens (from apps/marketing tailwind.config.ts) ---
        'on-primary': '#ffffff',
        surface: '#121414',
        'surface-dim': '#121414',
        'surface-bright': '#37393a',
        'surface-container-lowest': '#0c0f0f',
        'surface-container-low': '#1a1c1c',
        'surface-container': '#1e2020',
        'surface-container-high': '#282a2b',
        'surface-container-highest': '#333535',
        'on-background': '#e2e2e2',
        'on-surface': '#e2e2e2',
        'on-surface-variant': '#d3c0d6',
        outline: '#9c8ba0',
        'outline-variant': '#504254',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Marketing radii
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      fontFamily: {
        // Marketing typography
        headline: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animatePlugin, typographyPlugin],
}
