// root/postcss.config.js
export default {
  plugins: {
    tailwindcss: { config: "./tailwind.config.ts" }, // Explicitly point to root Tailwind config
    autoprefixer: {},
  },
};
