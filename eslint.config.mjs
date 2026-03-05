import nextVitals from "eslint-config-next/core-web-vitals"

const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "*.min.js",
    ],
  },
  ...nextVitals,
  {
    rules: {
      // Keep lint compatible with current codebase while migrating from `next lint` to ESLint v9 flat config.
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@/app/*"],
        },
      ],
    },
  },
  {
    files: ["lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@/app/*", "@/components/*"],
        },
      ],
    },
  },
  {
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]

export default config
