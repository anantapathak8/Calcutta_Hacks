/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                cyber: {
                    black: '#0a0a0a',
                    dark: '#111111',
                    gray: '#1a1a1a',
                    light: '#2a2a2a',
                    neon: '#a855f7',     // Purple
                    pink: '#ec4899',     // Pink  
                    orange: '#f97316',   // Orange
                    danger: '#ff003c',   // Cyber Red
                    warning: '#fcee0a',  // Cyber Yellow
                    success: '#0aff60',  // Cyber Green
                    text: '#e0e0e0',
                    dim: '#888888'
                }
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', 'monospace'],
                sans: ['Inter', 'sans-serif'],
                display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
            },
            animation: {
                'grid-flow': 'grid-flow 20s linear infinite',
                'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glitch': 'glitch 1s linear infinite',
                'scanline': 'scanline 8s linear infinite',
            },
            keyframes: {
                'grid-flow': {
                    '0%': { backgroundPosition: '0 0' },
                    '100%': { backgroundPosition: '50px 50px' },
                },
                glitch: {
                    '2%, 64%': { transform: 'translate(2px,0) skew(0deg)' },
                    '4%, 60%': { transform: 'translate(-2px,0) skew(0deg)' },
                    '62%': { transform: 'translate(0,0) skew(5deg)' },
                },
                scanline: {
                    '0%': { transform: 'translateY(-100%)' },
                    '100%': { transform: 'translateY(100vh)' }
                }
            },
            backgroundImage: {
                'grid-pattern': "linear-gradient(to right, rgba(168, 85, 247, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(168, 85, 247, 0.05) 1px, transparent 1px)",
            },
            boxShadow: {
                'neon-blue': '0 0 5px #00f3ff, 0 0 10px #00f3ff',
                'neon-purple': '0 0 10px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.3)',
                'neon-pink': '0 0 10px rgba(236, 72, 153, 0.5), 0 0 20px rgba(236, 72, 153, 0.3)',
                'neon-red': '0 0 5px #ff003c, 0 0 10px #ff003c',
            }
        },
    },
    plugins: [],
}
