/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent)',
        'accent-bg': 'var(--accent-bg)',
        'accent-border': 'var(--accent-border)',
        text: 'var(--text)',
        'text-h': 'var(--text-h)',
        border: 'var(--border)',
        'social-bg': 'var(--social-bg)',
        shadow: 'var(--shadow)',
      },
      boxShadow: {
        'custom': 'var(--shadow)',
      }
    },
  },
  plugins: [],
}
