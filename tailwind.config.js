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
          card: '#13141C',
          border: '#242634',
          violet: {
            DEFAULT: '#7D39EB',
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
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          'Helvetica Neue',
          'Segoe UI',
          'Apple SD Gothic Neo',
          'Noto Sans KR',
          'Malgun Gothic',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
