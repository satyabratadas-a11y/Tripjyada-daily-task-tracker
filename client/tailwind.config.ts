import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        status: {
          completed: '#34a853',
          progress: '#fbbc04',
          flagged: '#ea4335',
          sunday: '#ffd9b3',
          pending: '#e5e7eb',
        },
        brand: {
          DEFAULT: '#F2701C',
          light: '#FF9A50',
          dark: '#C85A0F',
        },
        ink: {
          DEFAULT: '#171717',
          light: '#2A2A2A',
        },
      },
    },
  },
  plugins: [],
};

export default config;
