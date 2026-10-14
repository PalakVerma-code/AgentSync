/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#07090e",
        surface: "#0d111a",
        card: "#121824",
        cyber: {
          cyan: "#00f2fe",
          violet: "#9d4edd",
          amber: "#ffb703",
          emerald: "#00f5d4",
          crimson: "#ff0055"
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
};