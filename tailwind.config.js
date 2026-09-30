/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'anime-pink': '#FF6B9D',
        'anime-purple': '#C084FC',
        'anime-blue': '#38BDF8',
        'anime-sakura': '#FDA4AF',
        'anime-dark': '#1a1a2e',
        'anime-light': '#f8f9fa',
      },
      fontFamily: {
        'round': ['ZCOOL KuaiLe', 'sans-serif'],
        'handwrite': ['Ma Shan Zheng', 'cursive'],
        'anime': ['ZCOOL XiaoWei', 'serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'fall': 'fall 10s linear infinite',
        'sparkle': 'sparkle 2s ease-in-out infinite',
        'bounce-slow': 'bounce 3s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #FF6B9D, 0 0 10px #FF6B9D' },
          '100%': { boxShadow: '0 0 20px #C084FC, 0 0 30px #C084FC' },
        },
        fall: {
          '0%': { transform: 'translateY(-100vh) rotate(0deg)', opacity: 1 },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: 0 },
        },
        sparkle: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.5, transform: 'scale(0.5)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'aurora': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'anime-gradient': 'linear-gradient(135deg, #FF6B9D 0%, #C084FC 100%)',
      },
    },
  },
  plugins: [],
}