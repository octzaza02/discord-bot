import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        amber: {
          bg: '#FFF8E8',
          surface: '#FFFFFF',
          border: '#E8C87A',
          gold: '#C8860A',
          primary: '#E07820',
          link: '#C8600A',
          sub: '#B8740A',
          heading: '#5C2D0A',
        },
      },
    },
  },
  plugins: [],
};
export default config;
