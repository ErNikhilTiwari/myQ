/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Clinical Design Palette
        navy: {
          DEFAULT: '#1E293B',
          dark: '#0F172A',
          light: '#334155',
        },
        teal: {
          DEFAULT: '#0284C7',
          hover: '#0369A1',
          light: '#E0F2FE',
        },
        canvas: {
          DEFAULT: '#F8FAFC',
          card: '#FFFFFF',
        },
        bodytext: {
          DEFAULT: '#334155',
          muted: '#64748B',
          light: '#94A3B8',
        },
        status: {
          critical: '#DC2626',
          warning: '#D97706',
          success: '#16A34A',
          info: '#2563EB',
        },
      },
    },
  },
  plugins: [],
}
