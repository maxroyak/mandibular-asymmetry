import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  // Global ignores
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended (type-aware is heavier; flat config variant)
  ...tseslint.configs.recommended,

  // React hooks rules
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // Project-specific overrides
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      // Allow unused vars prefixed with _ (common in test fixtures, callbacks)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      // Non-null assertions are used carefully in this codebase
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // Test files — relaxed rules
  {
    files: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-console": "off",
    },
  },
);