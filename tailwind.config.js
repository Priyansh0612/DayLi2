/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#6366f1", // indigo-500
        "primary-light": "#818cf8", // indigo-400
        "primary-dark": "#4f46e5", // indigo-600
        background: "#f4f4f9",
        "text-primary": "#111827", // gray-900
        "text-secondary": "#6b7280", // gray-500
        // The new Alive Kitchen Light Palette
        cream: '#F9F7F2',
        creamAlt: '#F0EBE1',
        ink: '#2C2621',
        inkMuted: '#685D52',
        ghost: '#A3978B',
        accent: '#D47B5A', // Warm clay/terracotta
        sage: '#708A6B',   // For vegetarian themes
        danger: '#B85C5C',
      },
      fontFamily: {
        heading: ["Outfit_700Bold"],
        body: ["PlusJakartaSans_500Medium"],
        "body-bold": ["PlusJakartaSans_700Bold"],
      },
    },
  },
  plugins: [],
}