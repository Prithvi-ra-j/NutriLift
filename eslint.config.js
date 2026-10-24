const expo = require("eslint-config-expo/flat");

const strict = {
  "no-console": "error",
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/ban-ts-comment": "error",
  "react-native/no-inline-styles": "error",
  "no-restricted-syntax": [
    "error",
    {
      selector:
        "CallExpression[callee.property.name='split'][callee.object.callee.property.name='toISOString']",
      message: "Use localDateString() from lib/time/localDate",
    },
    {
      selector:
        "CallExpression[callee.property.name='slice'][callee.object.callee.property.name='toISOString']",
      message: "Use localDateString() from lib/time/localDate for calendar dates",
    },
  ],
};

const ratchet = Object.fromEntries(
  Object.keys(strict).map((rule) => [rule, "warn"]),
);

const existingExpoViolations = {
  "react/no-unescaped-entities": "warn",
  "react/display-name": "warn",
  "react/no-children-prop": "warn",
  "import/namespace": "warn",
  "import/export": "warn",
  "react-hooks/immutability": "warn",
  "react-hooks/purity": "warn",
  "react-hooks/refs": "warn",
  "react-hooks/set-state-in-effect": "warn",
  "react-hooks/static-components": "warn",
};

module.exports = [
  ...expo,
  {
    ignores: [
      "android/**",
      "ios/**",
      "dist/**",
      "drizzle/**",
      "tools/dev/**",
      "apex/**",
    ],
  },
  {
    plugins: {
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
      "react-native": require("eslint-plugin-react-native"),
    },
  },
  { rules: existingExpoViolations },
  { rules: ratchet },
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name='split'][callee.object.callee.property.name='toISOString']",
          message: "Use localDateString() from lib/time/localDate",
        },
        {
          selector:
            "CallExpression[callee.property.name='slice'][callee.object.callee.property.name='toISOString']",
          message: "Use localDateString() from lib/time/localDate for calendar dates",
        },
      ],
    },
  },
  {
    files: ["**/*.{test,spec}.{js,jsx,ts,tsx}", "jest.setup.js"],
    languageOptions: {
      globals: {
        jest: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
  },
  {
    files: ["supabase/functions/**"],
    rules: { "import/no-unresolved": "warn" },
  },
  {
    files: [
      "lib/domain/**",
      "lib/time/**",
      "lib/data/**",
      "lib/ai/**",
      "lib/sync/**",
    ],
    rules: strict,
  },
  {
    files: ["lib/domain/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-native", "expo-*", "expo-*/*", "drizzle-orm", "@supabase/*"],
              message: "Domain rules must remain independent of application and persistence layers.",
            },
          ],
        },
      ],
    },
  },
];
