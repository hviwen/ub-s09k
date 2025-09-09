# 快速入门指南 - TypeScript 宽松模式

## 🎯 5分钟快速上手

### 1. 环境确认
确保项目已经配置了宽松的 TypeScript 环境：

```bash
# 检查配置是否生效
pnpm dev
```

如果没有类型错误阻塞开发，说明配置成功！

### 2. 创建你的第一个 JavaScript 文件

```javascript
// src/utils/myUtils.js
export function sayHello(name) {
  return `Hello, ${name}!`
}

export function getCurrentTime() {
  return new Date().toLocaleString()
}
```

### 3. 创建你的第一个 Vue 页面

```vue
<!-- src/pages/my-page/index.vue -->
<script setup>
import { ref } from 'vue'
import { sayHello } from '@/utils/myUtils.js'

definePage({
  style: {
    navigationBarTitleText: '我的页面'
  }
})

const message = ref('')
const userName = ref('开发者')

function handleClick() {
  message.value = sayHello(userName.value)
}
</script>

<template>
  <view class="page">
    <input v-model="userName" placeholder="输入你的名字" />
    <button @click="handleClick">打招呼</button>
    <text>{{ message }}</text>
  </view>
</template>

<style scoped>
.page {
  padding: 20px;
}
</style>
```

## 🚀 核心概念

### JavaScript vs TypeScript 对比

| 特性 | JavaScript 方式 | TypeScript 方式 |
|------|----------------|-----------------|
| 变量声明 | `const data = ref(null)` | `const data = ref<UserInfo \| null>(null)` |
| 函数定义 | `function save(data) { }` | `function save(data: UserInfo): Promise<void> { }` |
| API 调用 | `const result = await api.getUser()` | `const result: UserInfo = await api.getUser()` |
| 错误处理 | 使用 `@ts-ignore` 或 `any` | 正确的类型定义 |

### 何时使用 JavaScript？

✅ **推荐使用 JavaScript 的场景：**
- 简单的工具函数
- 基础的 UI 组件
- 快速原型开发
- 学习阶段的功能实现

⚠️ **建议保持 TypeScript 的场景：**
- 权限管理相关代码
- API 接口定义
- 复杂的业务逻辑
- 团队协作的核心模块

## 🛠️ 常用开发模式

### 1. API 调用模式

```javascript
// 简单方式
async function getUserInfo(userId) {
  try {
    const response = await http.get(`/users/${userId}`)
    return response.data
  } catch (error) {
    console.error('获取用户信息失败:', error)
    throw error
  }
}

// 使用 JSDoc 增加类型提示
/**
 * @typedef {Object} UserInfo
 * @property {number} id
 * @property {string} name
 * @property {string} email
 */

/**
 * @param {number} userId
 * @returns {Promise<UserInfo>}
 */
async function getUserInfoWithTypes(userId) {
  const response = await http.get(`/users/${userId}`)
  return response.data
}
```

### 2. 状态管理模式

```javascript
// Pinia Store - JavaScript 版本
export const useUserStore = defineStore('user', () => {
  const userInfo = ref(null)
  const isLoggedIn = computed(() => !!userInfo.value)
  
  function setUser(user) {
    userInfo.value = user
  }
  
  function logout() {
    userInfo.value = null
  }
  
  return {
    userInfo,
    isLoggedIn,
    setUser,
    logout
  }
})
```

### 3. 组件开发模式

```vue
<script setup>
// Props - 简单方式
const props = defineProps(['title', 'visible', 'data'])

// Props - 带类型检查
const props = defineProps({
  title: String,
  visible: Boolean,
  data: Object
})

// Emits
const emit = defineEmits(['update', 'close'])

// 响应式数据
const loading = ref(false)
const formData = ref({})

// 方法
function handleSubmit() {
  emit('update', formData.value)
}
</script>
```

## 🔧 解决常见问题

### 问题1：类型错误阻塞开发

```javascript
// 解决方案1：使用 any 类型
let userData = null // 会被推断为 any

// 解决方案2：使用 @ts-ignore
// @ts-ignore
const result = someComplexFunction()

// 解决方案3：类型断言
const data = response.data
```

### 问题2：导入路径错误

```javascript
// ❌ 错误的导入
import { utils } from '@/utils'

// ✅ 正确的导入
import { utils } from '@/utils/index.js'
import { formatDate } from '@/utils/helpers.js'
```

### 问题3：Vue 组件类型提示

```vue
<script setup>
// 使用 defineProps 获得基本类型检查
const props = defineProps({
  user: Object,
  visible: Boolean
})

// 访问 props 时会有智能提示
console.log(props.user.name) // 有提示
</script>
```

## 📋 开发检查清单

### 开始新功能前
- [ ] 确定是否可以用 JavaScript 开发
- [ ] 检查是否需要调用权限系统（建议保持 TS）
- [ ] 准备好相关的工具函数

### 开发过程中
- [ ] 遇到类型错误时，优先使用 `any` 或 `@ts-ignore`
- [ ] 复杂逻辑添加注释说明
- [ ] 使用 JSDoc 为重要函数添加类型提示

### 开发完成后
- [ ] 测试功能是否正常
- [ ] 检查控制台是否有错误
- [ ] 考虑是否需要优化类型定义

## 🎨 代码片段快速使用

在 VS Code 中输入以下前缀，快速生成代码：

- `vue-page` - 创建页面模板
- `vue-component` - 创建组件模板
- `api-function` - 创建 API 函数
- `pinia-store` - 创建 Pinia Store
- `util-function` - 创建工具函数

## 📚 学习资源

### 基础学习
1. **JavaScript 基础** - 先掌握 ES6+ 语法
2. **Vue 3 Composition API** - 理解响应式系统
3. **uni-app 开发** - 了解跨平台开发

### 进阶学习
1. **TypeScript 基础** - 逐步学习类型系统
2. **权限管理系统** - 理解项目的核心业务
3. **最佳实践** - 学习团队开发规范

## 🆘 获取帮助

### 遇到问题时的解决顺序
1. **查看控制台错误** - 大多数问题都有明确提示
2. **使用快速解决方案** - `any`、`@ts-ignore` 等
3. **查看项目示例** - 参考 `src/pages/demo/javascript-demo.vue`
4. **查看文档** - 阅读 `docs/developer-guide.md`
5. **寻求帮助** - 向团队成员咨询

### 常用命令
```bash
# 启动开发服务器
pnpm dev

# 构建项目
pnpm build

# 类型检查（可选）
pnpm type-check

# 代码格式化
pnpm lint --fix
```

## 🎯 下一步

1. **尝试创建一个简单页面** - 使用提供的模板
2. **实现一个基础功能** - 比如用户信息展示
3. **学习权限系统** - 了解如何集成权限控制
4. **逐步学习 TypeScript** - 在实践中提升技能

记住：**先实现功能，再优化类型！**
