import globals from 'globals';
import base from './base.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      // Nest DI constructor params look type-only to ESLint but must remain value imports.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
