import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Darkened from #877EFF for WCAG AA — white text on the original
        // shade was 3.25:1, below the required 4.5:1 (buttons, active nav
        // highlight). #6C5FEC clears it at 4.68:1, still clearly the same
        // brand purple. See ARCHITECTURE_DECISIONS.md ADR-029.
        'primary-500': '#6C5FEC',
        // Contrast is asymmetric: the darkening above (for white-text-on-
        // purple-background) pushed primary-500 too dark to itself pass as
        // *text* on this app's dark backgrounds (4.25–4.48:1, just under
        // 4.5). primary-400 is a lighter shade for that direction only —
        // text-on-dark contexts (links, accent text), never a button
        // background. See ARCHITECTURE_DECISIONS.md ADR-029.
        'primary-400': '#7A6FF5',
        'primary-600': '#5D5FEF',
        'secondary-500': '#FFB620',
        'off-white': '#D0DFFF',
        red: '#FF5A5A',
        'dark-1': '#000000',
        'dark-2': '#09090A',
        'dark-3': '#101012',
        'dark-4': '#1F1F22',
        'light-1': '#FFFFFF',
        'light-2': '#EFEFEF',
        'light-3': '#7878A3',
        // Lightened from #5C5C7B for WCAG AA — muted/secondary text at the
        // original shade was 3.10:1 against the app's dark backgrounds,
        // below the required 4.5:1. #7E7EAD clears it at 5.19:1. See
        // ARCHITECTURE_DECISIONS.md ADR-029.
        'light-4': '#7E7EAD',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      screens: {
        xs: '480px',
      },
      width: {
        '420': '420px',
        '465': '465px',
      },
      spacing: {
        // Matches the rendered height of `.bottom-bar` (index.css) — reserve
        // this much space above it wherever page content would otherwise sit
        // directly against the viewport bottom on mobile (e.g. ChatsPage's
        // message input, which is pinned to the bottom of a full-height
        // column rather than part of the page's normal scrollable flow).
        'bottom-nav': '82px',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
