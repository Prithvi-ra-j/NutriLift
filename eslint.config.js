const expo = require('eslint-config-expo/flat');
const reactNativePlugin = require('eslint-plugin-react-native');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

const strict = {
  'no-console': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/ban-ts-comment': 'error',
  'react-native/no-inline-styles': 'error',
  'no-restricted-syntax': ['error', {
    selector: `CallExpression[callee.property.name='split'][callee.object.callee.property.name='toISOString']`,
    message: 'Use localDateString() from lib/time/localDate',
  }],
};
const ratchet = {
  ...Object.fromEntries(Object.keys(strict).map((k) => [k, 'warn'])),
  // Expo SDK 54 app code predates the newer React Compiler purity/immutability
  // constraints. Keep these rules active as warnings for legacy app/src code;
  // new domain/data/AI modules continue to use strict error-level rules.
  'react-hooks/immutability': 'warn',
  'react-hooks/purity': 'warn',
  'react-hooks/set-state-in-effect': 'warn',
  'react-hooks/static-components': 'warn',
  'react-hooks/refs': 'warn',
};

module.exports = [
  ...expo,
  {
    // Work around eslint-plugin-react@7 using the removed getFilename API in ESLint 9+.
    settings: { react: { version: 'detect' } },
  },
  { ignores: ['android/**', 'ios/**', 'dist/**', 'drizzle/**', 'apex/**', 'tools/**'] },
  {
    // Ratchet: existing code stays at warn so CI doesn't immediately fail on legacy violations.
    plugins: { 'react-native': reactNativePlugin, '@typescript-eslint': tsPlugin },
    rules: ratchet,
  },
  {
    // Strict: new lib/ folders are error from day one (Section 8 flips global rules to strict).
    files: ['lib/domain/**', 'lib/time/**', 'lib/data/**', 'lib/ai/**', 'lib/sync/**'],
    plugins: { 'react-native': reactNativePlugin, '@typescript-eslint': tsPlugin },
    rules: strict,
  },

  {
    // Runtime globals for Node/Jest and Supabase's Deno Edge Functions.
    files: ['scripts/**/*.js', 'jest.setup.js'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        Buffer: 'readonly',
        jest: 'readonly',
      },
    },
  },
  {
    files: ['supabase/functions/**/*.ts'],
    rules: { 'import/no-unresolved': 'off' },
    languageOptions: {
      globals: { Deno: 'readonly' },
    },
  },
];
