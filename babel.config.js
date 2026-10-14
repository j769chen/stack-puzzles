module.exports = (api) => {
  const plugins = api.env('test') ? ['@babel/plugin-transform-class-static-block'] : [];
  return { presets: ['babel-preset-expo'], plugins };
};
