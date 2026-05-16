/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#002329',
          teal: '#08979c',
          light: '#a8e6e4',
          lighter: '#d6f5f4',
          lightest: '#ebf9f9',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg,#ebf9f9,#d6f5f4 35%,#a8e6e4 65%,#08979c)',
      },
    },
  },
  plugins: [],
};
