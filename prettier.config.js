/** @type {import("prettier").Config} */
const config = {
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/styles/globals.css',
  tailwindPreserveDuplicates: true,
  tailwindPreserveWhitespace: true,
  singleQuote: true,
  jsxSingleQuote: true,
  semi: true,
  trailingComma: 'es5',
  tabWidth: 2,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  printWidth: 120,
};

module.exports = config;
