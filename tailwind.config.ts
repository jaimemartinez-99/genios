import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        accent: "var(--color-accent)",
        parchment: "var(--color-parchment)",
        panel: "var(--color-panel)",
        border: "var(--color-border)"
      },
      fontFamily: {
        display: ["'Libre Baskerville'", "serif"],
        poem: ["'Cormorant Garamond'", "serif"],
        ui: ["'DM Sans'", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 24px rgba(193, 123, 111, 0.25)"
      },
      keyframes: {
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0.3" },
          "100%": { transform: "translateX(0)", opacity: "1" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        pulsemark: {
          "0%,100%": { boxShadow: "0 0 0 rgba(193,123,111,0)" },
          "50%": { boxShadow: "0 0 10px rgba(193,123,111,0.2)" }
        }
      },
      animation: {
        "slide-in-right": "slide-in-right 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        shimmer: "shimmer 1.8s linear infinite",
        pulsemark: "pulsemark 1.8s ease-in-out infinite"
      }
    }
  },
  plugins: []
} satisfies Config;
