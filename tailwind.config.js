/** Tailwind config: colours and fonts for the whole site */
module.exports = {
  content: ['./public/**/*.html', './public/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        field: '#F2F4F3',   // page background: cool grey-green, like lab equipment
        ink: '#12181B',     // text
        petrol: '#0B3C49',  // dark panels
        'petrol-2': '#124B5A',
        amber: '#F5B700',   // calls to action, like a status LED
        'amber-dark': '#D99F00',
        live: '#2FBF71',    // device online
        alert: '#E5484D',   // device offline
        line: '#D3DAD7',    // borders
        muted: '#5B6670',   // secondary text
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: { page: '72rem' },
    },
  },
  plugins: [],
};
