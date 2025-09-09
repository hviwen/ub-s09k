# 开发者使用指南

## 概述

本指南面向使用多角色权限管理系统的前端开发者，提供详细的使用示例、最佳实践和开发技巧。

## 快速开始

### 1. 基础设置

在组件中引入权限相关模块：

```typescript
// 引入权限Store
import { usePermissionStore } from '@/permission/store/permissionStore'

// 引入权限类型
import { UserRole, PermissionAction, ResourceType } from '@/permission/types'

// 引入权限组件
import PermissionWrapper from '@/permission/components/PermissionWrapper.vue'
import RoleSwitcher from '@/permission/components/RoleSwitcher.vue'
```

### 2. 在组件中使用权限检查

```vue
<template>
  <view class="page">
    <!-- 基础权限检查 -->
    <view v-if="canViewFundData">
      <text>基金数据内容</text>
    </view>
    
    <!-- 使用权限组件 -->
    <PermissionWrapper 
      :required-roles="[UserRole.CHANNEL, UserRole.INSTITUTIONAL]"
      show-placeholder
    >
      <button @click="handleAdvancedOperation">高级操作</button>
    </PermissionWrapper>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePermissionStore } from '@/permission/store/permissionStore'
import { UserRole, PermissionAction, ResourceType } from '@/permission/types'

const permissionStore = usePermissionStore()

// 计算属性：检查权限
const canViewFundData = computed(() => {
  return permissionStore.hasRole(UserRole.REGULAR) || 
         permissionStore.hasRole(UserRole.CHANNEL)
})

// 异步权限检查
const canEditData = ref(false)

onMounted(async () => {
  canEditData.value = await permissionStore.hasPermission(
    PermissionAction.WRITE,
    ResourceType.FINANCIAL_DATA,
    'fund-data'
  )
})

function handleAdvancedOperation() {
  // 高级操作逻辑
}
</script>
```

## 权限组件使用

### PermissionWrapper 组件

#### 基础用法

```vue
<template>
  <!-- 角色权限控制 -->
  <PermissionWrapper :required-roles="[UserRole.ADMIN]">
    <button>管理员功能</button>
  </PermissionWrapper>

  <!-- 详细权限控制 -->
  <PermissionWrapper 
    required-action="write"
    resource-type="user_data"
    resource-id="profile"
    check-mode="permission"
  >
    <button>编辑个人资料</button>
  </PermissionWrapper>

  <!-- 自定义权限检查 -->
  <PermissionWrapper 
    :custom-checker="(role) => role === UserRole.CHANNEL && isVipUser"
    check-mode="custom"
  >
    <view>VIP渠道用户专属内容</view>
  </PermissionWrapper>
</template>
```

#### 高级配置

```vue
<template>
  <PermissionWrapper 
    :required-roles="[UserRole.INSTITUTIONAL]"
    :show-placeholder="true"
    placeholder-text="需要机构用户权限才能访问"
    :show-upgrade-button="true"
    upgrade-button-text="申请机构权限"
    :hide-when-no-permission="false"
    :disable-when-no-permission="true"
    extra-class="custom-permission-wrapper"
    @permission-checked="handlePermissionChecked"
    @permission-denied="handlePermissionDenied"
    @upgrade="handleUpgrade"
    @click="handleClick"
  >
    <view class="protected-content">
      <text>机构用户专属功能</text>
    </view>
    
    <!-- 自定义占位符 -->
    <template #placeholder>
      <view class="custom-placeholder">
        <image src="/static/lock-icon.png" />
        <text>您需要机构用户权限</text>
        <button @click="applyForPermission">申请权限</button>
      </view>
    </template>
  </PermissionWrapper>
</template>

<script setup lang="ts">
import type { UserRole, AccessControlAction } from '@/permission/types'

function handlePermissionChecked(hasPermission: boolean, action: AccessControlAction) {
  console.log('权限检查结果:', hasPermission, action)
}

function handlePermissionDenied(reason: string) {
  uni.showToast({
    title: reason,
    icon: 'none'
  })
}

function handleUpgrade(role: UserRole) {
  // 跳转到权限申请页面
  uni.navigateTo({
    url: `/pages/permission/apply?role=${role}`
  })
}

function applyForPermission() {
  // 自定义权限申请逻辑
}
</script>
```

### RoleSwitcher 组件

#### 基础用法

```vue
<template>
  <view class="role-management">
    <RoleSwitcher 
      :show-history="true"
      :history-limit="10"
      @switch-success="handleSwitchSuccess"
      @switch-failed="handleSwitchFailed"
      @role-selected="handleRoleSelected"
    />
  </view>
</template>

<script setup lang="ts">
import type { UserRole } from '@/permission/types'

function handleSwitchSuccess(fromRole: UserRole, toRole: UserRole) {
  uni.showToast({
    title: `已从${fromRole}切换到${toRole}`,
    icon: 'success'
  })
  
  // 刷新页面数据
  refreshCurrentPageData()
}

function handleSwitchFailed(error: Error) {
  uni.showModal({
    title: '角色切换失败',
    content: error.message,
    showCancel: false
  })
}

function handleRoleSelected(role: Role) {
  console.log('用户选择了角色:', role)
}
</script>
```

## 权限指令使用

### v-role 指令

```vue
<template>
  <!-- 单个角色 -->
  <button v-role="UserRole.ADMIN">管理员功能</button>
  
  <!-- 多个角色（任意匹配） -->
  <button v-role="{ roles: [UserRole.CHANNEL, UserRole.INSTITUTIONAL] }">
    渠道或机构功能
  </button>
  
  <!-- 多个角色（全部匹配） -->
  <button v-role="{ 
    roles: [UserRole.CHANNEL, UserRole.INSTITUTIONAL], 
    mode: 'all' 
  }">
    需要同时具备渠道和机构角色
  </button>
  
  <!-- 无权限时禁用 -->
  <button v-role="{ 
    roles: [UserRole.ADMIN], 
    fallback: 'disable',
    placeholder: '需要管理员权限' 
  }">
    管理功能
  </button>
  
  <!-- 无权限时隐藏 -->
  <view v-role="{ 
    roles: [UserRole.INSTITUTIONAL], 
    fallback: 'hide' 
  }">
    机构用户专属内容
  </view>
  
  <!-- 无权限时显示占位符 -->
  <view v-role="{ 
    roles: [UserRole.CHANNEL], 
    fallback: 'placeholder',
    placeholder: '需要渠道用户权限' 
  }">
    渠道数据
  </view>
</template>
```

### v-permission 指令

```vue
<template>
  <!-- 基于角色的权限 -->
  <button v-permission="{ roles: [UserRole.ADMIN] }">
    管理员操作
  </button>
  
  <!-- 详细权限检查 -->
  <button v-permission="{ 
    action: 'write',
    resourceType: 'financial_data',
    resourceId: 'fund-123'
  }">
    编辑基金数据
  </button>
  
  <!-- 自定义权限检查 -->
  <view v-permission="{ 
    checker: (role) => role === UserRole.CHANNEL && userLevel >= 3,
    fallback: 'placeholder',
    placeholder: '需要3级以上渠道用户权限'
  }">
    高级渠道功能
  </view>
  
  <!-- 混合权限检查 -->
  <button v-permission="{ 
    roles: [UserRole.INSTITUTIONAL],
    action: 'read',
    resourceType: 'institutional_data',
    resourceId: 'report-2023',
    fallback: 'disable'
  }">
    查看机构报告
  </button>
</template>
```

### v-auth 指令

```vue
<template>
  <!-- 登录状态检查 -->
  <view v-auth>
    登录用户专属内容
  </view>
  
  <!-- 自定义未登录处理 -->
  <button v-auth="{ 
    fallback: 'disable',
    placeholder: '请先登录' 
  }">
    需要登录的功能
  </button>
  
  <!-- 未登录时显示占位符 -->
  <view v-auth="'placeholder'">
    用户个人信息
  </view>
</template>
```

## Store 集成和状态管理

### 在 Composition API 中使用

```typescript
import { computed, watch } from 'vue'
import { usePermissionStore } from '@/permission/store/permissionStore'

export default {
  setup() {
    const permissionStore = usePermissionStore()
    
    // 响应式计算属性
    const isAdmin = computed(() => 
      permissionStore.hasRole(UserRole.ADMIN)
    )
    
    const canManageUsers = computed(() => 
      permissionStore.currentPermissions.some(p => 
        p.resourceType === ResourceType.USER_MANAGEMENT && 
        p.actions.includes(PermissionAction.WRITE)
      )
    )
    
    // 监听角色变化
    watch(
      () => permissionStore.currentRole,
      (newRole, oldRole) => {
        console.log(`角色从 ${oldRole} 变更为 ${newRole}`)
        // 根据角色变化更新页面状态
        updatePageBasedOnRole(newRole)
      }
    )
    
    // 监听权限初始化
    watch(
      () => permissionStore.isInitialized,
      (initialized) => {
        if (initialized) {
          console.log('权限系统已初始化')
          loadUserSpecificData()
        }
      }
    )
    
    return {
      isAdmin,
      canManageUsers,
      permissionStore
    }
  }
}
```

### 在 Options API 中使用

```typescript
import { mapState, mapActions } from 'pinia'
import { usePermissionStore } from '@/permission/store/permissionStore'

export default {
  computed: {
    ...mapState(usePermissionStore, [
      'isLoggedIn',
      'currentRole',
      'currentRoleInfo',
      'availableRoles',
      'canSwitchRole'
    ]),
    
    // 自定义计算属性
    isPrivilegedUser() {
      return [UserRole.CHANNEL, UserRole.INSTITUTIONAL, UserRole.ADMIN]
        .includes(this.currentRole)
    },
    
    userPermissions() {
      return this.currentRoleInfo?.permissions || []
    }
  },
  
  methods: {
    ...mapActions(usePermissionStore, [
      'hasPermission',
      'switchRole',
      'hasRole'
    ]),
    
    async checkAndExecute(action, resourceType, resourceId, callback) {
      const hasPermission = await this.hasPermission(action, resourceType, resourceId)
      if (hasPermission) {
        callback()
      } else {
        uni.showToast({
          title: '权限不足',
          icon: 'none'
        })
      }
    }
  },
  
  watch: {
    currentRole(newRole, oldRole) {
      if (newRole !== oldRole) {
        this.onRoleChanged(newRole, oldRole)
      }
    }
  }
}
```

## 自定义权限策略开发

### 创建自定义权限策略

```typescript
// src/permission/strategies/CustomPermissionStrategy.ts
import { BasePermissionStrategy } from '@/permission/strategies'
import type { 
  PermissionContext, 
  PermissionCheckResult, 
  UserRole 
} from '@/permission/types'

export class CustomPermissionStrategy extends BasePermissionStrategy {
  constructor(role: UserRole, permissions: Permission[]) {
    super(role, permissions)
  }
  
  async checkPermission(context: PermissionContext): Promise<PermissionCheckResult> {
    // 调用基础检查
    const baseResult = await super.checkPermission(context)
    
    if (!baseResult.hasPermission) {
      return baseResult
    }
    
    // 自定义业务逻辑
    const customCheck = await this.performCustomCheck(context)
    
    return {
      hasPermission: customCheck.allowed,
      action: customCheck.action,
      message: customCheck.message,
      metadata: {
        ...baseResult.metadata,
        customCheckApplied: true
      }
    }
  }
  
  private async performCustomCheck(context: PermissionContext) {
    // 实现自定义权限检查逻辑
    // 例如：基于时间、地理位置、设备类型等
    
    const currentHour = new Date().getHours()
    
    // 工作时间限制
    if (context.resource.type === ResourceType.FINANCIAL_DATA && 
        (currentHour < 9 || currentHour > 18)) {
      return {
        allowed: false,
        action: AccessControlAction.COMPLETE_RESTRICTION,
        message: '金融数据仅在工作时间（9:00-18:00）可访问'
      }
    }
    
    return {
      allowed: true,
      action: AccessControlAction.UNRESTRICTED_ACCESS,
      message: '自定义检查通过'
    }
  }
}
```

### 注册自定义策略

```typescript
// src/permission/strategies/index.ts
import { CustomPermissionStrategy } from './CustomPermissionStrategy'

export class PermissionStrategyFactory {
  createStrategy(role: UserRole, permissions: Permission[]): IPermissionStrategy {
    switch (role) {
      case UserRole.CUSTOM:
        return new CustomPermissionStrategy(role, permissions)
      // ... 其他策略
      default:
        return new BasePermissionStrategy(role, permissions)
    }
  }
}
```

## 高级用法和技巧

### 1. 权限预加载

```typescript
// 在页面加载时预加载权限
export default {
  async onLoad() {
    const permissionStore = usePermissionStore()
    
    // 预加载页面相关权限
    const pagePermissions = [
      { action: 'read', resourceType: 'page', resourceId: 'fund-list' },
      { action: 'write', resourceType: 'user_data', resourceId: 'profile' },
      { action: 'read', resourceType: 'financial_data', resourceId: 'portfolio' }
    ]
    
    // 批量检查权限
    const results = await permissionStore.batchCheckPermissions(
      pagePermissions.map(p => ({
        userRole: permissionStore.userRoleInfo,
        resource: { type: p.resourceType, id: p.resourceId },
        action: p.action
      }))
    )
    
    // 根据权限结果初始化页面状态
    this.initializePageState(results)
  }
}
```

### 2. 权限缓存优化

```typescript
// 使用计算属性缓存权限检查结果
const permissionCache = new Map()

const cachedPermissionCheck = computed(() => {
  const key = `${currentRole.value}_${resourceType}_${resourceId}_${action}`
  
  if (!permissionCache.has(key)) {
    permissionCache.set(key, permissionStore.hasPermission(action, resourceType, resourceId))
  }
  
  return permissionCache.get(key)
})
```

### 3. 条件渲染优化

```vue
<template>
  <!-- 避免在 v-for 中使用权限组件 -->
  <view v-for="item in filteredItems" :key="item.id">
    {{ item.name }}
  </view>
</template>

<script setup lang="ts">
// 在计算属性中过滤数据
const filteredItems = computed(() => {
  return items.value.filter(item => {
    // 根据权限过滤项目
    return permissionStore.hasRole(UserRole.ADMIN) || 
           item.visibility === 'public'
  })
})
</script>
```

### 4. 错误处理和降级

```typescript
// 权限检查错误处理
async function safePermissionCheck(action, resourceType, resourceId) {
  try {
    return await permissionStore.hasPermission(action, resourceType, resourceId)
  } catch (error) {
    console.error('权限检查失败:', error)
    
    // 降级策略：根据角色提供默认权限
    if (permissionStore.hasRole(UserRole.ADMIN)) {
      return true
    }
    
    // 默认拒绝访问
    return false
  }
}
```

### 5. 性能监控集成

```typescript
// 监控权限检查性能
import { getPermissionPerformanceMonitor } from '@/permission/performance/PermissionPerformanceMonitor'

const performanceMonitor = getPermissionPerformanceMonitor()

async function monitoredPermissionCheck(action, resourceType, resourceId) {
  return await performanceMonitor.monitorAsync(
    'permission_check',
    () => permissionStore.hasPermission(action, resourceType, resourceId),
    { action, resourceType, resourceId }
  )
}
```

## 调试和故障排除

### 1. 开启调试模式

```typescript
// 在开发环境中开启详细日志
if (process.env.NODE_ENV === 'development') {
  const permissionStore = usePermissionStore()
  
  // 监听所有权限检查
  permissionStore.$subscribe((mutation, state) => {
    console.log('权限状态变化:', mutation, state)
  })
}
```

### 2. 权限检查调试

```typescript
// 添加调试信息的权限检查
async function debugPermissionCheck(action, resourceType, resourceId) {
  console.group(`权限检查: ${action} on ${resourceType}:${resourceId}`)
  
  console.log('当前角色:', permissionStore.currentRole)
  console.log('当前权限:', permissionStore.currentPermissions)
  
  const result = await permissionStore.hasPermission(action, resourceType, resourceId)
  
  console.log('检查结果:', result)
  console.groupEnd()
  
  return result
}
```

### 3. 常见问题诊断

```typescript
// 权限系统健康检查
function diagnosePermissionSystem() {
  const permissionStore = usePermissionStore()
  
  const issues = []
  
  if (!permissionStore.isInitialized) {
    issues.push('权限系统未初始化')
  }
  
  if (!permissionStore.isLoggedIn) {
    issues.push('用户未登录')
  }
  
  if (!permissionStore.currentRole) {
    issues.push('当前角色为空')
  }
  
  if (permissionStore.currentPermissions.length === 0) {
    issues.push('当前角色无任何权限')
  }
  
  if (issues.length > 0) {
    console.warn('权限系统诊断发现问题:', issues)
  } else {
    console.log('权限系统运行正常')
  }
  
  return issues
}
```

## 最佳实践总结

### 1. 性能优化
- 使用批量权限检查减少API调用
- 利用计算属性缓存权限检查结果
- 避免在循环中进行权限检查
- 合理使用权限预加载

### 2. 用户体验
- 提供清晰的权限不足提示
- 使用占位符而不是完全隐藏内容
- 提供权限申请或角色切换的引导
- 保持界面的一致性

### 3. 代码组织
- 将权限检查逻辑封装到计算属性中
- 使用权限组件和指令简化模板代码
- 创建可复用的权限检查函数
- 保持权限逻辑与业务逻辑的分离

### 4. 错误处理
- 始终为权限检查提供降级策略
- 记录权限相关的错误和异常
- 提供用户友好的错误提示
- 实现权限检查的重试机制

## 相关文档

- [API参考文档](./api-reference.md) - 详细的API说明
- [实施指南](./implementation-guide.md) - 系统部署指南
- [系统架构文档](./architecture.md) - 架构设计说明
- [用户手册](./user-manual.md) - 最终用户指南
- [测试文档](./testing.md) - 测试策略说明
