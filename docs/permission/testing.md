# 测试文档 - 多角色权限管理系统

## 概述

本文档描述了多角色权限管理系统的测试策略、测试用例设计、测试执行方法和质量保证要求。

## 测试策略

### 测试目标
- 确保权限控制功能正确性
- 验证角色切换机制的可靠性
- 保证系统性能满足要求（权限检查<50ms）
- 验证用户界面的易用性和一致性
- 确保系统安全性和数据保护

### 测试层次

#### 1. 单元测试 (Unit Testing)
**覆盖范围**:
- 权限控制器核心逻辑
- 角色切换服务
- 权限策略实现
- 缓存管理器
- 性能监控器

**测试工具**: Vitest + Vue Test Utils

#### 2. 集成测试 (Integration Testing)
**覆盖范围**:
- Store与组件的集成
- API服务与后端的集成
- 路由拦截器集成
- 权限组件集成

**测试工具**: Vitest + MSW (Mock Service Worker)

#### 3. 端到端测试 (E2E Testing)
**覆盖范围**:
- 完整的用户操作流程
- 跨页面的权限控制
- 角色切换的用户体验
- 错误处理和恢复

**测试工具**: Playwright 或 Cypress

#### 4. 性能测试 (Performance Testing)
**覆盖范围**:
- 权限检查响应时间
- 并发用户场景
- 缓存效率测试
- 内存使用情况

**测试工具**: Vitest + 自定义性能测试工具

## 测试环境配置

### 开发环境测试
```bash
# 安装测试依赖
npm install --save-dev vitest @vitest/ui @vue/test-utils happy-dom

# 运行单元测试
npm run test

# 运行测试并查看覆盖率
npm run test:coverage

# 启动测试UI界面
npm run test:ui
```

### 测试配置文件
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['src/permission/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/permission/__tests__/',
        '**/*.d.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
```

## 测试用例设计

### 权限控制器测试用例

#### 基础功能测试
```typescript
describe('PermissionController - 基础功能', () => {
  test('应该正确初始化权限控制器', () => {
    // 测试控制器初始化
  })
  
  test('应该正确检查用户拥有的权限', async () => {
    // 测试权限检查 - 正向案例
  })
  
  test('应该正确拒绝用户没有的权限', async () => {
    // 测试权限检查 - 负向案例
  })
  
  test('应该支持批量权限检查', async () => {
    // 测试批量权限检查功能
  })
})
```

#### 角色切换测试
```typescript
describe('PermissionController - 角色切换', () => {
  test('应该成功切换到可用角色', async () => {
    // 测试成功的角色切换
  })
  
  test('应该拒绝切换到不可用角色', async () => {
    // 测试失败的角色切换
  })
  
  test('应该在角色切换后清除相关缓存', async () => {
    // 测试缓存清理机制
  })
})
```

#### 性能测试
```typescript
describe('PermissionController - 性能', () => {
  test('权限检查应该在50ms内完成', async () => {
    const startTime = Date.now()
    await permissionController.hasPermission(action, resourceType, resourceId)
    const duration = Date.now() - startTime
    expect(duration).toBeLessThan(50)
  })
  
  test('批量权限检查应该比单独检查更高效', async () => {
    // 比较批量检查和单独检查的性能
  })
})
```

### 角色切换服务测试用例

#### 观察者模式测试
```typescript
describe('RoleSwitchService - 观察者模式', () => {
  test('应该正确添加和移除观察者', () => {
    // 测试观察者管理
  })
  
  test('应该在角色切换时通知观察者', async () => {
    // 测试事件通知机制
  })
  
  test('应该在切换失败时通知观察者', async () => {
    // 测试错误事件通知
  })
})
```

#### 并发控制测试
```typescript
describe('RoleSwitchService - 并发控制', () => {
  test('应该防止并发角色切换', async () => {
    // 测试并发切换控制
  })
  
  test('应该正确处理切换队列', async () => {
    // 测试切换队列机制
  })
})
```

### 权限Store测试用例

#### 状态管理测试
```typescript
describe('PermissionStore - 状态管理', () => {
  test('应该正确初始化Store状态', () => {
    // 测试Store初始化
  })
  
  test('应该正确响应状态变化', async () => {
    // 测试响应式状态更新
  })
  
  test('应该正确持久化状态', async () => {
    // 测试状态持久化
  })
})
```

#### 集成测试
```typescript
describe('PermissionStore - 集成测试', () => {
  test('应该与权限控制器正确集成', async () => {
    // 测试与控制器的集成
  })
  
  test('应该与角色切换服务正确集成', async () => {
    // 测试与切换服务的集成
  })
})
```

### 组件测试用例

#### PermissionWrapper组件测试
```typescript
describe('PermissionWrapper组件', () => {
  test('应该根据权限显示或隐藏内容', async () => {
    // 测试权限控制显示逻辑
  })
  
  test('应该正确显示占位符', async () => {
    // 测试占位符显示
  })
  
  test('应该正确处理权限检查事件', async () => {
    // 测试事件处理
  })
})
```

#### RoleSwitcher组件测试
```typescript
describe('RoleSwitcher组件', () => {
  test('应该显示可用角色列表', () => {
    // 测试角色列表显示
  })
  
  test('应该正确处理角色切换', async () => {
    // 测试角色切换交互
  })
  
  test('应该显示切换历史', async () => {
    // 测试历史记录显示
  })
})
```

### 指令测试用例

#### 权限指令测试
```typescript
describe('权限指令', () => {
  test('v-role指令应该正确控制元素显示', () => {
    // 测试v-role指令
  })
  
  test('v-permission指令应该正确检查权限', async () => {
    // 测试v-permission指令
  })
  
  test('v-auth指令应该正确检查登录状态', () => {
    // 测试v-auth指令
  })
})
```

## 测试执行方法

### 运行测试命令

```bash
# 运行所有测试
npm run test

# 运行特定测试文件
npm run test src/permission/__tests__/PermissionController.test.ts

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式运行测试
npm run test:watch

# 运行测试UI界面
npm run test:ui

# 运行性能测试
npm run test:performance
```

### 测试脚本配置

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch",
    "test:performance": "vitest --run src/permission/__tests__/performance/",
    "test:e2e": "playwright test",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

### 持续集成配置

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run test:coverage
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

## 测试数据管理

### 测试数据准备

```typescript
// src/permission/__tests__/fixtures/testData.ts
export const TEST_USER_ROLES = {
  GUEST_USER: {
    userId: 'guest-001',
    currentRole: {
      type: UserRole.GUEST,
      permissions: []
    }
  },
  
  REGULAR_USER: {
    userId: 'regular-001',
    currentRole: {
      type: UserRole.REGULAR,
      permissions: [
        {
          id: 'read-basic-content',
          resourceType: ResourceType.PAGE,
          actions: [PermissionAction.READ]
        }
      ]
    }
  },
  
  ADMIN_USER: {
    userId: 'admin-001',
    currentRole: {
      type: UserRole.ADMIN,
      permissions: [
        {
          id: 'admin-all',
          resourceType: ResourceType.ALL,
          actions: Object.values(PermissionAction)
        }
      ]
    }
  }
}
```

### Mock数据服务

```typescript
// src/permission/__tests__/mocks/apiMocks.ts
import { vi } from 'vitest'

export const mockPermissionApi = {
  validatePermission: vi.fn(),
  getUserRoles: vi.fn(),
  switchRole: vi.fn(),
  getRolePermissions: vi.fn()
}

// 设置默认mock响应
mockPermissionApi.validatePermission.mockResolvedValue({
  hasPermission: true,
  action: 'unrestricted_access'
})
```

## 质量保证要求

### 代码覆盖率要求

| 类型 | 最低要求 | 目标 |
|------|----------|------|
| 语句覆盖率 | 80% | 90% |
| 分支覆盖率 | 80% | 85% |
| 函数覆盖率 | 80% | 90% |
| 行覆盖率 | 80% | 90% |

### 性能要求

| 指标 | 要求 |
|------|------|
| 权限检查响应时间 | < 50ms |
| 角色切换时间 | < 100ms |
| 批量权限检查 | 比单独检查快30%以上 |
| 缓存命中率 | > 80% |

### 测试通过标准

#### 功能测试
- 所有单元测试必须通过
- 集成测试覆盖主要业务流程
- 端到端测试验证用户操作路径

#### 性能测试
- 权限检查性能满足要求
- 并发测试无死锁或竞态条件
- 内存使用在合理范围内

#### 安全测试
- 权限绕过测试全部通过
- 角色提权测试全部阻止
- 敏感数据访问控制有效

## 测试报告

### 自动化测试报告

测试执行后会生成以下报告：

1. **覆盖率报告** (`coverage/index.html`)
   - 详细的代码覆盖率统计
   - 未覆盖代码的具体位置
   - 覆盖率趋势图表

2. **测试结果报告** (`test-results.xml`)
   - 所有测试用例的执行结果
   - 失败测试的详细信息
   - 执行时间统计

3. **性能测试报告** (`performance-report.json`)
   - 权限检查性能数据
   - 性能趋势分析
   - 性能瓶颈识别

### 手动测试报告模板

```markdown
## 测试报告

**测试日期**: 2024-01-15
**测试版本**: v1.0.0
**测试人员**: 张三

### 测试概要
- 测试用例总数: 150
- 通过用例数: 148
- 失败用例数: 2
- 通过率: 98.7%

### 主要发现
1. 权限检查功能正常
2. 角色切换机制稳定
3. 发现2个UI显示问题

### 问题列表
| 问题ID | 严重程度 | 问题描述 | 状态 |
|--------|----------|----------|------|
| BUG-001 | 低 | 权限提示文案显示不完整 | 待修复 |
| BUG-002 | 中 | 角色切换后页面刷新延迟 | 已修复 |

### 建议
1. 优化权限提示的用户体验
2. 增加更多的错误处理机制
```

## 测试最佳实践

### 1. 测试编写原则
- **单一职责**: 每个测试只验证一个功能点
- **独立性**: 测试之间不应相互依赖
- **可重复**: 测试结果应该是确定的
- **快速执行**: 单元测试应该快速完成

### 2. Mock使用指南
- 对外部依赖进行Mock
- 保持Mock数据的真实性
- 及时更新Mock以反映API变化
- 避免过度Mock导致测试失真

### 3. 测试维护
- 定期更新测试用例
- 删除过时的测试代码
- 重构重复的测试逻辑
- 保持测试代码的可读性

### 4. 调试技巧
- 使用测试UI界面进行调试
- 利用断点和日志定位问题
- 隔离失败的测试用例
- 检查测试环境配置

## 相关文档

- [实施指南](./implementation-guide.md) - 系统部署和配置
- [开发者使用指南](./developer-guide.md) - 开发者使用说明
- [API参考文档](./api-reference.md) - 详细的API说明
- [系统架构文档](./architecture.md) - 架构设计说明
- [用户手册](./user-manual.md) - 最终用户操作指南
