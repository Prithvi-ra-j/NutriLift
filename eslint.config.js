const expo = require('eslint-config-expo/flat');

const strict = {
  'no-console': 'error',
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/ban-ts-comment': 'error',
  'react-native/no-inline-styles': 'error',
  'no-restricted-syntax': ['error', {
    selector: "CallExpression[callee.property.name='split'][callee.object.callee.property.name='toISOString']",
    message: 'Use localDateString() from lib/time/localDate',
  }],
};

const ratchet = Object.fromEntries(Object.keys(strict).map((key) => [key, 'warn']));

module.exports = [
  ...expo,
  {
    ignores: [
      'android/**',
      'ios/**',
      'dist/**',
      'drizzle/**',
      'tools/dev/**',
      'node_modules/**',
    ],
  },
  { rules: ratchet },
  {
    files: ['lib/domain/**', 'lib/time/**', 'lib/data/**', 'lib/ai/**', 'lib/sync/**'],
    rules: strict,
  },
];
