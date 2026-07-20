import reactNative from '@luxaria/eslint-config/react-native';

export default [
  {
    ignores: ['jest.config.js', 'jest.setup.js', 'babel.config.js'],
  },
  ...reactNative,
];
