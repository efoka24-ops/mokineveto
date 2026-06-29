import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        green: {
          50: '#f0fdf4',
          600: '#16a34a',
          700: '#15803d',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
