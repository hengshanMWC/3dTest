module.exports = {
  syntax: 'postcss-scss',
  plugins: {
    autoprefixer: {},
    '@unocss/postcss': {},
    'postcss-pxtorem': {
      propList: ['*'], // 需要转换的 CSS 属性，* 表示全部
      unitPrecision: 5, // 转换后的小数位数
      minPixelValue: 2,
    },
  },
}
