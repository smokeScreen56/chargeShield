/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        shield: {
          bg: "#0B1120",
          card: "#111827",
          border: "#1F2937",
          accent: "#38BDF8",
          warning: "#F59E0B",
          danger: "#EF4444",
          success: "#10B981"
        }
      }
    },
  },
  plugins: [],
}
