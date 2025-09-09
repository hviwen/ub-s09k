# 权限管理系统 API 参考文档

## 概述

本文档详细描述了多角色权限管理系统的所有API接口，包括前端API和后端API的规范、请求/响应格式、错误处理等。

## 前端 API

### 权限Store API

#### usePermissionStore()
获取权限管理Store实例。

```typescript
import { usePermissionStore } from '@/permission/store/permissionStore'

const permissionStore = usePermissionStore()
```

#### 状态属性

| 属性名 | 类型 | 描述 |
|--------|------|------|
| `isInitialized` | `boolean` | 权限系统是否已初始化 |
| `isLoggedIn` | `boolean` | 用户是否已登录 |
| `currentRole` | `UserRole \| null` | 当前用户角色 |
| `currentUserId` | `string \| number \| null` | 当前用户ID |
| `currentRoleInfo` | `Role \| null` | 当前角色详细信息 |
| `availableRoles` | `Role[]` | 可用角色列表 |
| `currentPermissions` | `Permission[]` | 当前角色权限列表 |
| `canSwitchRole` | `boolean` | 是否可以切换角色 |
| `lastUpdated` | `number \| null` | 最后更新时间 |

#### 方法

##### initializePermissions(userRoleInfo)
初始化用户权限信息。

```typescript
async initializePermissions(userRoleInfo: UserRoleInfo): Promise<void>
```

**参数**:
- `userRoleInfo`: 用户角色信息对象

**示例**:
```typescript
const userRoleInfo = {
  userId: 'user123',
  currentRole: {
    id: 'role-regular',
    type: UserRole.REGULAR,
    name: '普通用户',
    permissions: [...],
    status: 'active'
  },
  availableRoles: [...],
  lastUpdated: Date.now()
}

await permissionStore.initializePermissions(userRoleInfo)
```

##### hasPermission(action, resourceType, resourceId)
检查用户是否具有指定权限。

```typescript
async hasPermission(
  action: PermissionAction,
  resourceType: ResourceType,
  resourceId: string
): Promise<boolean>
```

**参数**:
- `action`: 权限操作类型
- `resourceType`: 资源类型
- `resourceId`: 资源ID

**返回值**: `Promise<boolean>` - 是否有权限

**示例**:
```typescript
// 检查是否可以查看基金详情
const canViewFund = await permissionStore.hasPermission(
  PermissionAction.READ,
  ResourceType.FINANCIAL_DATA,
  'fund-123'
)

if (canViewFund) {
  // 显示基金详情
} else {
  // 显示权限不足提示
}
```

##### switchRole(targetRole, reason)
切换用户角色。

```typescript
async switchRole(targetRole: UserRole, reason?: string): Promise<boolean>
```

**参数**:
- `targetRole`: 目标角色
- `reason`: 切换原因（可选）

**返回值**: `Promise<boolean>` - 切换是否成功

**示例**:
```typescript
const success = await permissionStore.switchRole(
  UserRole.CHANNEL,
  '需要访问渠道功能'
)

if (success) {
  uni.showToast({ title: '角色切换成功', icon: 'success' })
} else {
  uni.showToast({ title: '角色切换失败', icon: 'error' })
}
```

##### hasRole(role)
检查用户是否具有指定角色。

```typescript
hasRole(role: UserRole): boolean
```

**参数**:
- `role`: 要检查的角色

**返回值**: `boolean` - 是否具有该角色

**示例**:
```typescript
if (permissionStore.hasRole(UserRole.ADMIN)) {
  // 显示管理员功能
}
```

##### logout()
用户登出，清除权限状态。

```typescript
async logout(): Promise<void>
```

**示例**:
```typescript
await permissionStore.logout()
// 权限状态已清除，用户需要重新登录
```

### 权限控制器 API

#### PermissionController
权限控制器提供底层的权限检查功能。

```typescript
import { PermissionController } from '@/permission/core/PermissionController'

const controller = new PermissionController(options)
```

##### batchCheckPermissions(contexts)
批量检查权限。

```typescript
async batchCheckPermissions(
  contexts: PermissionContext[]
): Promise<PermissionCheckResult[]>
```

**参数**:
- `contexts`: 权限上下文数组

**返回值**: `Promise<PermissionCheckResult[]>` - 权限检查结果数组

**示例**:
```typescript
const contexts = [
  {
    userRole: userRoleInfo,
    resource: { type: ResourceType.PAGE, id: 'fund-list' },
    action: PermissionAction.READ
  },
  {
    userRole: userRoleInfo,
    resource: { type: ResourceType.USER_DATA, id: 'profile' },
    action: PermissionAction.WRITE
  }
]

const results = await controller.batchCheckPermissions(contexts)
results.forEach((result, index) => {
  console.log(`权限${index}: ${result.hasPermission}`)
})
```

### 内容访问控制器 API

#### ContentAccessController
内容访问控制器提供细粒度的内容权限控制。

```typescript
import { ContentAccessController } from '@/permission/core/ContentAccessController'

const accessController = new ContentAccessController()
```

##### checkContentAccess(contentId, context)
检查内容访问权限。

```typescript
async checkContentAccess(
  contentId: string,
  context?: Record<string, any>
): Promise<AccessControlAction>
```

**参数**:
- `contentId`: 内容ID
- `context`: 额外上下文信息（可选）

**返回值**: `Promise<AccessControlAction>` - 访问控制动作

**示例**:
```typescript
const action = await accessController.checkContentAccess('article-123', {
  userLevel: 'premium',
  deviceType: 'mobile'
})

switch (action) {
  case AccessControlAction.UNRESTRICTED_ACCESS:
    // 完全访问
    break
  case AccessControlAction.READ_ONLY:
    // 只读访问
    break
  case AccessControlAction.COMPLETE_RESTRICTION:
    // 完全限制
    break
}
```

## 后端 API 规范

### 基础信息

**Base URL**: `/api/permission`
**认证方式**: Bearer Token
**内容类型**: `application/json`

### 用户角色管理

#### 获取用户角色信息
```http
GET /api/permission/users/{userId}/roles
```

**路径参数**:
- `userId`: 用户ID

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "userId": "user123",
    "currentRole": {
      "id": "role-regular",
      "type": "regular",
      "name": "普通用户",
      "description": "普通用户角色",
      "permissions": [
        {
          "id": "perm-1",
          "name": "查看基础内容",
          "resourceType": "page",
          "resourceId": "basic-content",
          "actions": ["read"]
        }
      ],
      "status": "active",
      "createdAt": 1640995200000,
      "updatedAt": 1640995200000
    },
    "availableRoles": [...],
    "lastUpdated": 1640995200000
  }
}
```

#### 切换用户角色
```http
POST /api/permission/users/{userId}/role-switch
```

**请求体**:
```json
{
  "targetRole": "channel",
  "reason": "需要访问渠道功能"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "角色切换成功",
  "data": {
    "success": true,
    "newRole": {
      "id": "role-channel",
      "type": "channel",
      "name": "渠道用户",
      "permissions": [...]
    },
    "switchRecord": {
      "id": "switch-123",
      "fromRole": "regular",
      "toRole": "channel",
      "switchTime": 1640995200000,
      "reason": "需要访问渠道功能",
      "success": true
    }
  }
}
```

#### 获取角色切换历史
```http
GET /api/permission/users/{userId}/role-switch-history?limit=20
```

**查询参数**:
- `limit`: 限制返回数量（可选，默认20）

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "switch-123",
      "fromRole": "regular",
      "toRole": "channel",
      "switchTime": 1640995200000,
      "reason": "需要访问渠道功能",
      "success": true
    }
  ]
}
```

### 权限验证

#### 验证权限
```http
POST /api/permission/validate
```

**请求体**:
```json
{
  "userId": "user123",
  "currentRole": "regular",
  "resource": {
    "type": "financial_data",
    "id": "fund-123",
    "metadata": {
      "category": "equity_fund"
    }
  },
  "action": "read",
  "extra": {
    "deviceType": "mobile",
    "timestamp": 1640995200000
  }
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "hasPermission": true,
    "action": "unrestricted_access",
    "message": "允许访问",
    "metadata": {
      "checkTime": 1640995200000,
      "cacheHit": false
    }
  }
}
```

#### 批量验证权限
```http
POST /api/permission/batch-validate
```

**请求体**:
```json
{
  "contexts": [
    {
      "userId": "user123",
      "currentRole": "regular",
      "resource": {
        "type": "page",
        "id": "fund-list"
      },
      "action": "read"
    },
    {
      "userId": "user123",
      "currentRole": "regular",
      "resource": {
        "type": "user_data",
        "id": "profile"
      },
      "action": "write"
    }
  ]
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "hasPermission": true,
      "action": "unrestricted_access"
    },
    {
      "hasPermission": false,
      "action": "complete_restriction",
      "message": "权限不足"
    }
  ]
}
```

### 角色权限管理

#### 获取角色权限列表
```http
GET /api/permission/roles/{role}/permissions
```

**路径参数**:
- `role`: 角色类型（guest, regular, channel, institutional, admin）

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "perm-1",
      "name": "查看基础内容",
      "description": "允许查看基础页面内容",
      "resourceType": "page",
      "resourceId": "basic-content",
      "actions": ["read"],
      "conditions": null,
      "priority": 1
    }
  ]
}
```

#### 获取所有角色列表
```http
GET /api/permission/roles
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "role-guest",
      "type": "guest",
      "name": "游客",
      "description": "未登录用户",
      "permissions": [],
      "status": "active"
    },
    {
      "id": "role-regular",
      "type": "regular",
      "name": "普通用户",
      "description": "已登录的普通用户",
      "permissions": [...],
      "status": "active"
    }
  ]
}
```

### 内容访问控制

#### 获取内容访问规则
```http
GET /api/permission/content/{contentId}/access-rules
```

**路径参数**:
- `contentId`: 内容ID

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "contentId": "article-123",
    "contentType": "premium_article",
    "roleAccessRules": {
      "guest": "complete_restriction",
      "regular": "read_only",
      "channel": "unrestricted_access",
      "institutional": "unrestricted_access",
      "admin": "unrestricted_access"
    },
    "defaultAction": "complete_restriction",
    "conditions": [
      {
        "type": "time_based",
        "config": {
          "startTime": "09:00",
          "endTime": "18:00"
        }
      }
    ]
  }
}
```

#### 检查内容访问权限
```http
POST /api/permission/content/{contentId}/check-access
```

**请求体**:
```json
{
  "context": {
    "userRole": "regular",
    "deviceType": "mobile",
    "timestamp": 1640995200000
  }
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "action": "read_only",
    "message": "允许只读访问"
  }
}
```

## 错误处理

### 错误码规范

| 错误码 | 描述 | 处理建议 |
|--------|------|----------|
| `40001` | 权限不足 | 引导用户登录或切换角色 |
| `40002` | 角色切换失败 | 检查角色状态和切换权限 |
| `40003` | 无效的权限参数 | 检查请求参数格式 |
| `40004` | 用户未登录 | 引导用户登录 |
| `40005` | 角色状态异常 | 联系管理员处理 |
| `50001` | 权限服务异常 | 稍后重试或联系技术支持 |
| `50002` | 缓存服务异常 | 清除缓存后重试 |

### 错误响应格式

```json
{
  "code": 40001,
  "message": "权限不足",
  "data": null,
  "error": {
    "type": "PERMISSION_DENIED",
    "details": "用户角色 'regular' 无权访问资源 'admin_panel'",
    "suggestions": [
      "请联系管理员申请相应权限",
      "或切换到具有相应权限的角色"
    ]
  },
  "timestamp": 1640995200000,
  "requestId": "req-123456"
}
```

## 接口调用最佳实践

### 1. 权限检查优化
```typescript
// 使用批量检查减少API调用
const contexts = pages.map(page => ({
  userRole: userRoleInfo,
  resource: { type: ResourceType.PAGE, id: page.id },
  action: PermissionAction.READ
}))

const results = await permissionStore.batchCheckPermissions(contexts)
```

### 2. 缓存利用
```typescript
// 利用缓存提高性能
const cacheKey = `permission_${userId}_${role}_${action}_${resourceType}_${resourceId}`
const cachedResult = await cacheManager.get(cacheKey)

if (cachedResult) {
  return cachedResult
}
```

### 3. 错误处理
```typescript
try {
  const hasPermission = await permissionStore.hasPermission(action, resourceType, resourceId)
  return hasPermission
} catch (error) {
  console.error('权限检查失败:', error)
  // 降级处理：默认拒绝访问
  return false
}
```

### 4. 性能监控
```typescript
const startTime = Date.now()
const result = await permissionStore.hasPermission(action, resourceType, resourceId)
const duration = Date.now() - startTime

if (duration > 100) {
  console.warn(`权限检查耗时过长: ${duration}ms`)
}
```

## 版本兼容性

当前API版本：`v1.0`

### 版本升级指南
- 新增字段向后兼容
- 废弃字段会提前通知
- 破坏性变更会发布新版本

### API版本控制
```http
# 在请求头中指定API版本
Accept: application/vnd.permission.v1+json
```

## 相关文档

更多详细信息请参考：
- [实施指南](./implementation-guide.md) - 系统部署和配置指南
- [开发者使用指南](./developer-guide.md) - 开发者使用说明
- [系统架构文档](./architecture.md) - 系统架构和设计说明
- [用户手册](./user-manual.md) - 最终用户操作指南
- [测试文档](./testing.md) - 测试策略和用例说明
