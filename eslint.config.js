import js from "@eslint/js";

const nodeGlobals = {
  URL: "readonly",
  Buffer: "readonly",
  console: "readonly",
  process: "readonly",
  setImmediate: "readonly",
  setTimeout: "readonly",
};

const browserGlobals = {
  AbortController: "readonly",
  alert: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  document: "readonly",
  fetch: "readonly",
  L: "readonly",
  navigator: "readonly",
  setTimeout: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  window: "readonly",
};

export default [
  { ignores: ["node_modules/**"] },
  js.configs.recommended,
  {
    files: [
      "backend/**/*.js",
      "scripts/**/*.js",
      "tests/**/*.js",
      "eslint.config.js",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: nodeGlobals,
    },
  },
  {
    files: ["frontend/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: browserGlobals,
    },
  },
  {
    rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_" }] },
  },
];
