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
        yellowGlow: "0 0 24px rgba(255, 212, 0, 0.28)"
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
