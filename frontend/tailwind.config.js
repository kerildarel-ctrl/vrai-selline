/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        selline: {
          dark:   '#0F172A',
          navy:   '#1E293B',
          yellow: '#FACC15',
          orange: '#F97316',
          light:  '#F1F5F9',
          gray:   '#64748B',
          green:  '#10B981',
          red:    '#EF4444',
          indigo: '#6366F1',
        },
      },
      fontFamily: {
        // Poppins chargé depuis Google Fonts dans index.html
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl:   '1rem',
        '2xl':'1.25rem',
        '3xl':'1.5rem',
      },
      boxShadow: {
        card:  '0 1px 3px rgba(15,23,42,.04), 0 4px 20px rgba(15,23,42,.07)',
        pop:   '0 8px 32px rgba(15,23,42,.14)',
        glow:  '0 0 32px rgba(250,204,21,.30)',
        'glow-orange': '0 0 24px rgba(249,115,22,.25)',
      },
      keyframes: {
        shimmer:    { '100%': { transform: 'translateX(100%)' } },
        rise:       { from: { opacity:'0', transform:'translateY(10px)' }, to: { opacity:'1', transform:'none' } },
        fadeInUp:   { from: { opacity:'0', transform:'translateY(20px)' }, to: { opacity:'1', transform:'translateY(0)' } },
        float:      { '0%,100%':{ transform:'translateY(0)' }, '50%':{ transform:'translateY(-6px)' } },
        pulseSoft:  { '0%,100%':{ opacity:'1' }, '50%':{ opacity:'.65' } },
      },
      animation: {
        rise:         'rise .35s ease-out both',
        fadeInUp:     'fadeInUp .55s ease both',
        float:        'float 3s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
