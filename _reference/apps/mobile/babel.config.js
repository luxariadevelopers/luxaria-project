module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        require.resolve('babel-preset-expo', {
          paths: [__dirname, require('path').resolve(__dirname, '../..')],
        }),
      ],
    ],
  };
};
