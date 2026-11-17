/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#000000',
          dark: '#0B0C10',
          darker: '#060709',
          sidebar: '#0A0A0C',
          'sidebar-border': '#1E1E2A',
          'sidebar-hover': '#181924',
          card: '#13141C',
          border: '#242634',
          violet: {
            DEFAULT: '#7D39EB',
            hover: '#6025C5',
            light: '#9B65F1',
            dark: '#6025C5',
            soft: '#F4EFFE',
          },
          lime: {
            DEFAULT: '#C6FF33',
            hover: '#B8F224',
            dark: '#93C418',
            soft: '#F7FEDF',
          },
        },
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#F8FAFC',
          muted: '#F1F5F9',
        },
        content: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
          subtle: '#94A3B8',
        },
      },
      fontFamily: {
        sans: [
          'Space Grotesk',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Segoe UI',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
