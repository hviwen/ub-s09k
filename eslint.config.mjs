import uniHelper from '@uni-helper/eslint-config'

export default uniHelper({
  unocss: true,
  vue: true,
  markdown: false,
  ignores: [
    'src/uni_modules/',
    'dist',
    // unplugin-auto-import 生成的类型文件，每次提交都改变，所以加入这里吧，与 .gitignore 配合使用
    'auto-import.d.ts',
    // vite-plugin-uni-pages 生成的类型文件，每次切换分支都一堆不同的，所以直接 .gitignore
    'uni-pages.d.ts',
    // 插件生成的文件
    'src/pages.json',
    'src/manifest.json',
    // 忽略自动生成文件
    'src/service/app/**',
  ],
  // https://eslint-config.antfu.me/rules
  rules: {
    // ==================== 基础规则 ====================
    'no-useless-return': 'off',
    'no-console': 'off',
    'no-unused-vars': 'off',
    'vue/no-unused-refs': 'off',
    'unused-imports/no-unused-vars': 'off',
    'eslint-comments/no-unlimited-disable': 'off',
    'jsdoc/check-param-names': 'off',
    'jsdoc/require-returns-description': 'off',
    'ts/no-empty-object-type': 'off',
    'no-extend-native': 'off',

    // ==================== TypeScript 宽松规则配置 ====================
    // 允许使用 any 类型，降低类型学习门槛
    '@typescript-eslint/no-explicit-any': 'off',
    'ts/no-explicit-any': 'off',

    // 允许使用 @ts-ignore 注释，方便快速解决类型问题
    '@typescript-eslint/ban-ts-comment': 'off',
    'ts/ban-ts-comment': 'off',

    // 允许非空断言操作符 (!)，简化类型处理
    '@typescript-eslint/no-non-null-assertion': 'off',
    'ts/no-non-null-assertion': 'off',

    // 未使用变量设为警告而非错误，不阻塞开发
    '@typescript-eslint/no-unused-vars': 'warn',
    'ts/no-unused-vars': 'warn',

    // 允许空函数，便于快速原型开发
    '@typescript-eslint/no-empty-function': 'off',
    'ts/no-empty-function': 'off',

    // 允许使用 require() 语句
    '@typescript-eslint/no-var-requires': 'off',
    'ts/no-var-requires': 'off',

    // 允许不明确的函数返回类型
    '@typescript-eslint/explicit-function-return-type': 'off',
    'ts/explicit-function-return-type': 'off',

    // 允许不明确的模块边界类型
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'ts/explicit-module-boundary-types': 'off',

    // 允许使用 Function 类型
    '@typescript-eslint/ban-types': 'off',
    'ts/ban-types': 'off',

    // 允许空接口定义
    '@typescript-eslint/no-empty-interface': 'off',
    'ts/no-empty-interface': 'off',

    // 允许使用 object 类型
    '@typescript-eslint/no-object-literal-type-assertion': 'off',
    'ts/no-object-literal-type-assertion': 'off',
    'vue/singleline-html-element-content-newline': [
      'error',
      {
        externalIgnores: ['text'],
      },
    ],
    // vue SFC 调换顺序改这里
    'vue/block-order': [
      'error',
      {
        order: [['script', 'template'], 'style'],
      },
    ],

    // 强制大括号样式为 1tbs：使 else/catch 与前一行的闭合大括号同一行
    'brace-style': ['error', '1tbs', { allowSingleLine: true }],
  },
  formatters: {
    /**
     * Format CSS, LESS, SCSS files, also the `<style>` blocks in Vue
     * By default uses Prettier
     */
    css: true,
    /**
     * Format HTML files
     * By default uses Prettier
     */
    html: true,
  },
})
