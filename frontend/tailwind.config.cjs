/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FAF8F5',
          100: '#F5EFEB',
          200: '#EADBCF',
          300: '#DCBFAB',
          400: '#CDA286',
          500: '#C5A880', // Champagne Gold
          600: '#B29369',
          700: '#94754E',
          800: '#755A3B',
          900: '#574229',
        },
        plum: {
          50: '#F7F5F8',
          100: '#EEEAF0',
          200: '#D9CCD9',
          300: '#BAA2BA',
          400: '#977A97',
          500: '#735773',
          600: '#5F465F',
          700: '#4C374C',
          800: '#382838',
          900: '#1E1A22',
          950: '#151218',
        },
        sage: {
          50: '#F4F8F6',
          100: '#E6EFEA',
          200: '#C3DFD1',
          300: '#97C8B1',
          400: '#64AC8E',
          500: '#40906F',
          600: '#327358',
          700: '#2A5D49',
          800: '#224B3B',
          900: '#1C3E31',
        },
        rosegold: {
          50: '#FCF7F7',
          100: '#FAF0EF',
          200: '#F2DDD9',
          300: '#EAAAA4',
          400: '#E0A9A5',
          500: '#D48680',
          600: '#C06660',
          700: '#A44E49',
          850: '#7B3430',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
        'glass-hover': '0 12px 40px 0 rgba(31, 38, 135, 0.15)',
        'card-soft': '0 4px 20px 0 rgba(0, 0, 0, 0.03)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
