import nestjs from '@luxaria/eslint-config/nestjs';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nestjs,
  {
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
];
