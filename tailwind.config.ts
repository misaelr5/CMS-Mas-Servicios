import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brandYellow: "#FFD400",
        brandBlack: "#111111",
        brandWhite: "#FFFFFF",
        darkSurface: "#1A1A1A",
        mediumGray: "#6F726B",
        lightGray: "#E8E5DC",
        woodGray: "#8A8175",
        success: "#18A058",
        warning: "#F2B705",
        danger: "#D92D20",
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        cardForeground: "var(--card-foreground)",
        popover: "var(--popover)",
        popoverForeground: "var(--popover-foreground)",
        primary: "var(--primary)",
        primaryForeground: "var(--primary-foreground)",
        secondary: "var(--secondary)",
        secondaryForeground: "var(--secondary-foreground)",
        muted: "var(--muted)",
        mutedForeground: "var(--muted-foreground)",
        accent: "var(--accent)",
        accentForeground: "var(--accent-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)"
      },
      borderRadius: {
        sm: "8px",
        md: "14px",
        lg: "22px",
        xl: "28px",
        full: "999px"
      },
      boxShadow: {
        soft: "0 8px 24px rgba(0, 0, 0, 0.12)",
        medium: "0 14px 40px rgba(0, 0, 0, 0.20)",
        yellowGlow: "0 0 24px rgba(255, 212, 0, 0.28)",
        lift: "0 16px 40px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(255, 212, 0, 0.07)",
        "glow-sm": "0 0 12px rgba(255, 212, 0, 0.18)",
        "inner-yellow": "inset 0 1px 0 rgba(255, 212, 0, 0.12)"
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" }
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to:   { opacity: "1", transform: "scale(1)" }
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-10px)" },
          to:   { opacity: "1", transform: "translateX(0)" }
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255, 212, 0, 0)" },
          "50%":       { boxShadow: "0 0 20px 4px rgba(255, 212, 0, 0.15)" }
        },
        shimmer: {
          from: { backgroundPosition: "200% center" },
          to:   { backgroundPosition: "-200% center" }
        }
      },
      animation: {
        "fade-in-up":    "fade-in-up 0.38s ease-out both",
        "fade-in":       "fade-in 0.25s ease-out both",
        "scale-in":      "scale-in 0.22s ease-out both",
        "slide-in-left": "slide-in-left 0.28s ease-out both",
        "pulse-glow":    "pulse-glow 2.4s ease-in-out infinite",
        shimmer:         "shimmer 2.2s linear infinite"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["var(--font-montserrat)", "Montserrat", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      backgroundImage: {
        "dashboard-grid":
          "linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)"
      }
    }
  },
  plugins: [tailwindAnimate]
};

export default config;
