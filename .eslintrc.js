module.exports = {
  root: true,
  extends: [
    '@antfu/eslint-config-vue',
    '@abmao/eslint-config-vue',
    '@unocss',
    // 新增，必须放在最后面
    'plugin:prettier/recommended',
  ],
  rules: {},
}
