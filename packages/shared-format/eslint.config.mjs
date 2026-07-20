import base from '@luxaria/eslint-config/base';

export default [
  {
    ignores: ['dist/**', 'jest.config.cjs'],
  },
  ...base,
];
