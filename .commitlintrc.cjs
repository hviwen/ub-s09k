const {execSync} = require('child_process')
const {DateTime} = require("luxon");

const branch = execSync('git branch --show-current || true').toString().trim()
const defaultMsg = DateTime.local().toFormat('MM-dd HH:mm')

module.exports = {
  extends: ['@commitlint/config-conventional'],
  prompt: {
    messages: {
      "type": "提交类型:",
      "subject": "变更描述:\n",
      "body": "详细描述（可选）。使用“|”换行:\n",
      "confirmCommit": "提交或修改commit？"
    },
    types: [
      {
        "value": "feat",
        "name": "feat: [✨  新增功能]",
        "emoji": ":sparkles:"
      },
      {
        "value": "fix",
        "name": "fix: [🐛  修复缺陷]",
        "emoji": ":bug:"
      },
      {
        "value": "docs",
        "name": "docs: [📚  文档变更]",
        "emoji": ":books:"
      },
      {
        "value": "style",
        "name": "style: [💄  代码格式（不影响功能，例如空格、分号等格式修正）]",
        "emoji": ":lipstick:"
      },
      {
        "value": "refactor",
        "name": "refactor: [📦  代码重构（不包括 bug 修复、功能新增）]",
        "emoji": ":package:"
      },
      {
        "value": "perf",
        "name": "perf: [🚀  性能优化]",
        "emoji": ":rocket:"
      },
      {
        "value": "conflict",
        "name": "conflict: [🧰  修改冲突]",
        "emoji": ":rewind:"
      },
      {
        "value": "test",
        "name": "test: [✅  添加疏漏测试或已有测试改动]",
        "emoji": ":white_check_mark:"
      },
      {
        "value": "build",
        "name": "build: [🔧  构建流程、外部依赖变更（如升级 npm 包、修改 vite 配置等）]",
        "emoji": ":wrench:"
      },
      {
        "value": "ci",
        "name": "ci: [🎡  修改 CI 配置、脚本]",
        "emoji": ":ferris_wheel:"
      },
      {
        "value": "revert",
        "name": "revert: [⏪️  回滚 commit]",
        "emoji": ":rewind:"
      },
      {
        "value": "chore",
        "name": "chore: [🔨  对构建过程或辅助工具和库的更改（不影响源文件、测试用例）]",
        "emoji": ":hammer:"
      },
      {
        "value": "fonts",
        "name": "fonts: [🔠  字体文件更新]",
        "emoji": ":capital_abcd:"
      },
      {
        "value": "delete",
        "name": "delete: [🆑  删除文件]",
        "emoji": ":cl:"
      }
    ],
    scopes: [
      {value: 'base', name: 'base: 基础内容'},
      {value: 'node', name: 'node: node相关'},
      {value: 'framework', name: 'framework: 框架相关'},
      {value: 'features', name: 'features: 功能相关'},
      {value: 'notes', name: 'notes: 笔记相关'},
      {value: 'others', name: 'others: 其他类型'},
    ],
    skipQuestions: ['scope', 'body', 'breaking', 'footerPrefix', 'footer'], // 跳过问题
    useEmoji: false,
    allowCustomScopes: false,
    allowCustomIssuePrefix: false,
    maxSubjectLength: 100,
    defaultType: 'feat',
    defaultScope: 'base',
    defaultBody: `${branch} ${defaultMsg}`,
    defaultSubject: defaultMsg,
  },
  rules: {
    'body-leading-blank': [1, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'footer-leading-blank': [1, 'always'],
    'footer-max-line-length': [1, 'always', 100],
    'header-max-length': [2, 'always', 100],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'conflict',
        'fonts',
        'delete',
        'stash',
      ],
    ],
  },
}
