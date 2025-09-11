# 渐进式迁移策略

## 🎯 迁移目标

创建一个 JavaScript 和 TypeScript 混合的开发环境，让开发者可以：
- 新功能优先用 JavaScript 快速开发
- 核心模块保持 TypeScript 的类型安全
- 逐步学习和应用 TypeScript 特性

## 📊 模块分类

### 🟢 优先迁移为 JavaScript（低风险）

#### 1. 工具函数模块
```
src/utils/
├── index.ts → index.js          ✅ 可迁移
├── platform.ts → platform.js   ✅ 可迁移
├── systemInfo.ts → systemInfo.js ✅ 可迁移
└── uploadFile.ts → uploadFile.js ✅ 可迁移
```

**迁移难度**：⭐
**预计时间**：2-4小时
**风险评估**：低

#### 2. 简单页面组件
```
src/pages/
├── about/about.vue              ✅ 移除 lang="ts"
├── index/index.vue              ✅ 移除 lang="ts"
└── login/login.vue              ✅ 移除 lang="ts"
```

**迁移难度**：⭐
**预计时间**：1-2小时
**风险评估**：低

#### 3. 基础组件
```
src/components/
└── (新增的简单组件)             ✅ 直接用 JavaScript
```

### 🟡 选择性迁移（中等风险）

#### 1. 状态管理
```
src/store/
├── theme.ts                     🔄 可选迁移
├── user.ts                      ⚠️  建议保持 TS
└── token.ts                     ⚠️  建议保持 TS
```

**迁移难度**：⭐⭐
**预计时间**：4-6小时
**风险评估**：中等

#### 2. 路由配置
```
src/router/
├── config.ts → config.js        🔄 可选迁移
└── interceptor.ts               ⚠️  建议保持 TS
```

### 🔴 保持 TypeScript（高风险）

#### 1. 权限管理系统
```
src/permission/                  ❌ 强烈建议保持 TS
├── types/                       ❌ 复杂类型定义
├── core/                        ❌ 核心业务逻辑
├── store/                       ❌ 状态管理
└── directives/                  ❌ Vue 指令
```

**原因**：
- 包含复杂的枚举和接口定义
- 涉及安全相关的业务逻辑
- 类型检查能有效防止权限漏洞

#### 2. API 接口层
```
src/api/                         ⚠️  建议保持 TS
├── types/                       ❌ 接口类型定义
├── login.ts                     ⚠️  认证相关
└── permission.ts                ❌ 权限相关
```

#### 3. HTTP 请求封装
```
src/http/                        ⚠️  建议保持 TS
├── types.ts                     ❌ 类型定义
├── http.ts                      ⚠️  核心请求逻辑
└── interceptor.ts               ⚠️  拦截器逻辑
```

## 🚀 迁移实施计划

### 第一阶段：基础迁移（第1周）

#### 目标
- 迁移工具函数
- 简化页面组件
- 建立混合开发环境

#### 具体任务
1. **迁移 utils 目录**
   ```bash
   # 重命名文件
   mv src/utils/index.ts src/utils/index.js
   mv src/utils/platform.ts src/utils/platform.js
   mv src/utils/systemInfo.ts src/utils/systemInfo.js
   ```

2. **简化页面组件**
   ```vue
   <!-- 修改前 -->
   <script lang="ts" setup>
   
   <!-- 修改后 -->
   <script setup>
   ```

3. **验证构建**
   ```bash
   pnpm dev
   pnpm build
   ```

### 第二阶段：选择性迁移（第2-3周）

#### 目标
- 迁移非核心状态管理
- 优化开发体验
- 建立最佳实践

#### 具体任务
1. **迁移主题状态管理**
   ```javascript
   // src/store/theme.js
   export const useThemeStore = defineStore('theme-store', () => {
     const theme = ref('light')
     const themeVars = ref({})
     
     return { theme, themeVars }
   })
   ```

2. **创建 JavaScript 组件模板**
   ```vue
   <!-- src/templates/component.vue -->
   <script setup>
   // 组件逻辑
   </script>
   
   <template>
     <!-- 组件模板 -->
   </template>
   ```

### 第三阶段：优化和完善（第4周）

#### 目标
- 完善开发文档
- 建立代码规范
- 性能优化

## 📋 迁移检查清单

### 迁移前检查
- [ ] 确认模块的复杂度和风险等级
- [ ] 备份原始 TypeScript 文件
- [ ] 检查模块的依赖关系
- [ ] 确认测试覆盖情况

### 迁移过程
- [ ] 重命名文件扩展名（.ts → .js）
- [ ] 移除类型注解和接口导入
- [ ] 添加 JSDoc 注释（可选）
- [ ] 更新导入路径
- [ ] 验证功能正常

### 迁移后验证
- [ ] 运行开发服务器测试
- [ ] 执行构建流程
- [ ] 运行相关测试用例
- [ ] 检查控制台错误
- [ ] 验证业务功能

## 🛠️ 迁移工具和脚本

### 批量重命名脚本
```bash
#!/bin/bash
# rename-utils.sh - 批量重命名 utils 目录下的文件

cd src/utils
for file in *.ts; do
  if [ "$file" != "*.ts" ]; then
    mv "$file" "${file%.ts}.js"
    echo "Renamed: $file → ${file%.ts}.js"
  fi
done
```

### 类型注解清理脚本
```javascript
// clean-types.js - 简单的类型注解清理工具
const fs = require('fs')
const path = require('path')

function cleanTypeAnnotations(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  
  // 移除简单的类型注解
  content = content.replace(/: string/g, '')
  content = content.replace(/: number/g, '')
  content = content.replace(/: boolean/g, '')
  content = content.replace(/: any/g, '')
  
  // 移除 import type 语句
  content = content.replace(/import type .+/g, '')
  
  fs.writeFileSync(filePath, content)
}
```

## 📈 迁移进度跟踪

### 进度指标
- **文件迁移率**：已迁移文件数 / 总文件数
- **功能完整性**：迁移后功能测试通过率
- **开发效率**：新功能开发时间对比
- **错误率**：运行时错误数量变化

### 里程碑
- [ ] 第1周：完成基础工具函数迁移
- [ ] 第2周：完成页面组件简化
- [ ] 第3周：完成选择性状态管理迁移
- [ ] 第4周：完成文档和规范建立

## ⚠️ 风险控制

### 回滚策略
1. **Git 分支管理**
   ```bash
   git checkout -b migration/javascript-support
   # 迁移工作在分支进行
   ```

2. **分步提交**
   ```bash
   git commit -m "feat: migrate utils to JavaScript"
   git commit -m "feat: simplify page components"
   ```

3. **功能验证**
   - 每个迁移步骤后进行功能测试
   - 保持 CI/CD 流水线通过
   - 监控生产环境指标

### 应急预案
- 如果迁移导致严重问题，立即回滚到上一个稳定版本
- 保留原始 TypeScript 文件作为备份
- 建立快速恢复机制

## 📚 参考资源

- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [JSDoc 语法指南](https://jsdoc.app/)
- [Vue 3 + JavaScript 最佳实践](https://vuejs.org/)
- [项目开发者指南](./developer-guide.md)
