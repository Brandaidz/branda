/** @type {import("tailwindcss").Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require("daisyui"),
  ],
  daisyui: {
    themes: [
      {
        mytheme: { // you can name your theme whatever you want
          "primary": "#007BFF",
          "secondary": "#f6d860", // Placeholder, can be adjusted
          "accent": "#7AD8C8",
          "neutral": "#3d4451", // Placeholder, can be adjusted
          "base-100": "#ffffff", // Placeholder, can be adjusted
          // Add other colors as needed based on DaisyUI theme structure
        },
      },
      // You can add other themes like "dark", "cupcake", etc.
      "light", // Including a default theme as fallback
    ],
    darkTheme: "dark", // name of one of the included themes for dark mode
    base: true, // applies background color and foreground color for root element by default
    styled: true, // include daisyUI colors and design decisions for all components
    utils: true, // adds responsive and modifier utility classes
    prefix: "", // prefix for daisyUI classnames (components, modifiers and responsive class names. Not colors)
    logs: true, // Shows info about daisyUI version and used config in the console when building your CSS
    themeRoot: ":root", // The element that receives theme color CSS variables
  },
}

