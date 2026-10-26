/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Bricolage Grotesque', 'Georgia', 'serif'],
        sans: ['Bricolage Grotesque', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'Courier New', 'monospace'],
      },
      colors: {
        paper: {
          bg: '#F5F2EB',       // Warm off-white technical ledger paper
          card: '#FCFAF6',     // Clean card stock
          warm: '#EFEBE1',     // Manila / aged document tint
          recessed: '#E5DFD3', // Depressed track / bay
          border: '#161616',   // Carbon ink border
        },
        ink: {
          black: '#121314',    // Dense black ink
          body: '#262626',     // Charcoal body text
          muted: '#525252',    // Faded ink / pencil
          faint: '#8C877D',    // Drafting guidelines
        },
        signal: {
          amber: '#C2410C',    // Hazard warning amber/orange
          orange: '#EA580C',   // Safety orange
          dark: '#9A3412',
        },
        status: {
          red: '#B91C1C',      // Lockout / Block stamp
          green: '#15803D',    // Operational / Allowed
          amber: '#B45309',    // Alert / Caution
        }
      },
      boxShadow: {
        hard: '3px 3px 0px #161616',
        'hard-lg': '5px 5px 0px #161616',
        'hard-sm': '2px 2px 0px #161616',
        'hard-hover': '1px 1px 0px #161616',
        'hard-amber': '3px 3px 0px #C2410C',
        'hard-red': '3px 3px 0px #B91C1C',
        'hard-green': '3px 3px 0px #15803D',
      }
    },
  },
  plugins: [],
}
