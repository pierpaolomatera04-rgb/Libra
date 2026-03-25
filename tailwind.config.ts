import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Colori principali Libra
        sage: {
          50: '#f6f7f4',
          100: '#e8ebe3',
          200: '#d4daca',
          300: '#b5c1a5',
          400: '#97a983',
          500: '#87A96B',
          600: '#6b8a52',
          700: '#556d41',
          800: '#455836',
          900: '#3a4a2f',
        },
        cream: {
          50: '#FEFDFB',
          100: '#FBF9F3',
          200: '#F5F5DC',
          300: '#EDE8C8',
          400: '#E0D9A8',
          500: '#D4CB8A',
        },
        bark: {
          50: '#faf8f6',
          100: '#f0ebe4',
          200: '#e0d5c8',
          300: '#c9b8a4',
          400: '#b09680',
          500: '#9a7b64',
          600: '#846653',
          700: '#6d5344',
          800: '#5b463b',
          900: '#4d3c34',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        serif: ['Georgia', 'Cambria', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
