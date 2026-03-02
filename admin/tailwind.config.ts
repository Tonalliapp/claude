import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E2C97E',
          bright: '#F0D890',
          dark: '#9A7B2F',
          muted: '#A08840',
          glow: 'rgba(201, 168, 76, 0.15)',
        },
        tonalli: {
          black: '#0A0A0A',
          'black-rich': '#0E0E0E',
          'black-soft': '#141414',
          'black-card': '#1A1A1A',
          'black-elevated': '#222222',
        },
        jade: {
          DEFAULT: '#4A8C6F',
          light: '#5FA882',
          bright: '#72BF96',
          dark: '#3A6F58',
          deep: '#2D5A47',
          muted: '#3E7A60',
          glow: 'rgba(74, 140, 111, 0.15)',
          'glow-strong': 'rgba(74, 140, 111, 0.25)',
        },
        silver: {
          DEFAULT: '#C0C0C0',
          light: '#D8D8D8',
          muted: '#8A8A8A',
          dark: '#6A6A6A',
        },
        platinum: '#E8E4DF',
        'white-warm': '#F8F6F3',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        body: ['Outfit', 'sans-serif'],
      },
      borderColor: {
        subtle: 'rgba(255, 255, 255, 0.02)',
        'gold-border': 'rgba(201, 168, 76, 0.08)',
        'light-border': 'rgba(255, 255, 255, 0.04)',
        'jade-border': 'rgba(74, 140, 111, 0.1)',
      },
      backgroundColor: {
        'status-pending': 'rgba(201, 168, 76, 0.12)',
        'status-preparing': 'rgba(192, 192, 192, 0.1)',
        'status-ready': 'rgba(74, 140, 111, 0.15)',
        'table-jade': 'rgba(74, 140, 111, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
