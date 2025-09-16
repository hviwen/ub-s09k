/**
 * 多角色权限管理系统 - 核心类型定义
 * @description 定义角色、权限、用户状态等核心类型
 * @author unibest权限管理系统
 * @version 1.0.0
 */

// ==================== 基础枚举定义 ====================

/**
 * 用户角色类型枚举
 */
export enum UserRole {
  /** 游客用户（未认证） */
  GUEST = 'guest',
  /** 普通用户 */
  REGULAR = 'regular',
  /** 渠道用户 */
  CHANNEL = 'channel',
  /** 机构用户 */
  INSTITUTIONAL = 'institutional',
  /** 管理员 */
  ADMIN = 'admin',
}

/**
 * 权限操作类型枚举
 */
export enum PermissionAction {
  /** 查看 */
  VIEW = 'view',
  /** 编辑 */
  EDIT = 'edit',
  /** 删除 */
  DELETE = 'delete',
  /** 分享 */
  SHARE = 'share',
  /** 收藏 */
  FAVORITE = 'favorite',
  /** 下载 */
  DOWNLOAD = 'download',
  /** 评论 */
  COMMENT = 'comment',
  /** 创建 */
  CREATE = 'create',
}

/**
 * 资源类型枚举
 */
export enum ResourceType {
  /** 页面 */
  PAGE = 'page',
  /** 组件 */
  COMPONENT = 'component',
  /** API接口 */
  API = 'api',
  /** 内容 */
  CONTENT = 'content',
  /** 功能模块 */
  MODULE = 'module',
}

/**
 * 访问控制动作枚举
 */
export enum AccessControlAction {
  /** 只读访问 */
  READ_ONLY = 'read_only',
  /** 完全限制 */
  COMPLETE_RESTRICTION = 'complete_restriction',
  /** 无限制访问 */
  UNRESTRICTED_ACCESS = 'unrestricted_access',
  /** 登录引导 */
  LOGIN_GUIDANCE = 'login_guidance',
  /** 角色切换引导 */
  ROLE_SWITCH_GUIDANCE = 'role_switch_guidance',
  /** 审批等待 */
  APPROVAL_PENDING = 'approval_pending',
  /** 账户异常 */
  ACCOUNT_EXCEPTION = 'account_exception',
}

/**
 * 角色状态枚举
 */
export enum RoleStatus {
  /** 激活 */
  ACTIVE = 'active',
  /** 待审核 */
  PENDING = 'pending',
  /** 已停用 */
  DISABLED = 'disabled',
  /** 已过期 */
  EXPIRED = 'expired',
}

// ==================== 核心接口定义 ====================

/**
 * 权限定义接口
 */
export interface Permission {
  /** 权限ID */
  id: string
  /** 权限名称 */
  name: string
  /** 权限描述 */
  description?: string
  /** 资源类型 */
  resourceType: ResourceType
  /** 资源标识 */
  resourceId: string
  /** 允许的操作 */
  actions: PermissionAction[]
  /** 权限条件（可选） */
  conditions?: Record<string, any>
  /** 权限优先级 */
  priority?: number
}

/**
 * 角色定义接口
 */
export interface Role {
  /** 角色ID */
  id: string
  /** 角色类型 */
  type: UserRole
  /** 角色名称 */
  name: string
  /** 角色描述 */
  description?: string
  /** 角色权限列表 */
  permissions: Permission[]
  /** 角色状态 */
  status: RoleStatus
  /** 角色配置 */
  config?: RoleConfig
  /** 创建时间 */
  createdAt?: number
  /** 更新时间 */
  updatedAt?: number
  /** 过期时间 */
  expiresAt?: number
}

/**
 * 角色配置接口
 */
export interface RoleConfig {
  /** 是否允许切换到其他角色 */
  allowRoleSwitch?: boolean
  /** 可切换的角色列表 */
  switchableRoles?: UserRole[]
  /** 角色特殊配置 */
  specialConfig?: Record<string, any>
  /** 数据访问范围 */
  dataScope?: string[]
}

/**
 * 用户角色信息接口
 */
export interface UserRoleInfo {
  /** 用户ID */
  userId: string | number
  /** 当前激活角色 */
  currentRole: Role
  /** 用户拥有的所有角色 */
  availableRoles: Role[]
  /** 角色切换历史 */
  switchHistory?: RoleSwitchRecord[]
  /** 最后更新时间 */
  lastUpdated?: number
}

/**
 * 角色切换记录接口
 */
export interface RoleSwitchRecord {
  /** 记录ID */
  id: string
  /** 源角色 */
  fromRole: UserRole
  /** 目标角色 */
  toRole: UserRole
  /** 切换时间 */
  switchTime: number
  /** 切换原因 */
  reason?: string
  /** 是否成功 */
  success: boolean
}

/**
 * 权限检查结果接口
 */
export interface PermissionCheckResult {
  /** 是否有权限 */
  hasPermission: boolean
  /** 访问控制动作 */
  action: AccessControlAction
  /** 结果消息 */
  message?: string
  /** 重定向URL */
  redirectUrl?: string
  /** 额外数据 */
  metadata?: Record<string, any>
}

/**
 * 内容访问控制配置接口
 */
export interface ContentAccessConfig {
  /** 内容ID */
  contentId: string
  /** 内容类型 */
  contentType: string
  /** 角色访问规则 */
  roleAccessRules: Record<UserRole, AccessControlAction>
  /** 默认访问动作 */
  defaultAction: AccessControlAction
  /** 自定义检查函数 */
  customChecker?: (role: UserRole, context?: any) => AccessControlAction
}

// ==================== 工具类型定义 ====================

/**
 * 权限上下文接口
 */
export interface PermissionContext {
  /** 当前用户角色信息 */
  userRole: UserRoleInfo
  /** 请求的资源 */
  resource?: {
    type: ResourceType
    id: string
    metadata?: Record<string, any>
  }
  /** 请求的操作 */
  action?: PermissionAction
  /** 额外上下文数据 */
  extra?: Record<string, any>
}

/**
 * 角色切换选项接口
 */
export interface RoleSwitchOptions {
  /** 目标角色 */
  targetRole: UserRole
  /** 切换原因 */
  reason?: string
  /** 是否保存切换历史 */
  saveHistory?: boolean
  /** 是否异步切换（立即返回，后台处理） */
  async?: boolean
  /** 是否跳过本地更新（用于异步切换） */
  skipLocalUpdate?: boolean
  /** 切换后的回调 */
  onSuccess?: (newRole: Role) => void
  /** 切换失败的回调 */
  onError?: (error: Error) => void
}

/**
 * 权限配置接口
 */
export interface PermissionConfig {
  /** 是否启用权限检查 */
  enabled: boolean
  /** 默认角色 */
  defaultRole: UserRole
  /** 权限检查缓存时间（毫秒） */
  cacheTimeout: number
  /** 是否启用调试模式 */
  debug: boolean
  /** 自定义权限检查器 */
  customCheckers?: Record<string, Function>
}

// ==================== 类型守卫函数 ====================

/**
 * 检查是否为有效的用户角色
 */
export function isValidUserRole(role: any): role is UserRole {
  return Object.values(UserRole).includes(role)
}

/**
 * 检查是否为有效的权限操作
 */
export function isValidPermissionAction(action: any): action is PermissionAction {
  return Object.values(PermissionAction).includes(action)
}

/**
 * 检查是否为有效的资源类型
 */
export function isValidResourceType(type: any): type is ResourceType {
  return Object.values(ResourceType).includes(type)
}

/**
 * 检查角色是否处于激活状态
 */
export function isRoleActive(role: Role): boolean {
  if (role.status !== RoleStatus.ACTIVE) {
    return false
  }

  if (role.expiresAt && role.expiresAt < Date.now()) {
    return false
  }

  return true
}

// ==================== 常量定义 ====================

/**
 * 默认权限配置
 */
export const DEFAULT_PERMISSION_CONFIG: PermissionConfig = {
  enabled: true,
  defaultRole: UserRole.GUEST,
  cacheTimeout: 5 * 60 * 1000, // 5分钟
  debug: false,
}

/**
 * 角色优先级映射
 */
export const ROLE_PRIORITY_MAP: Record<UserRole, number> = {
  [UserRole.GUEST]: 0,
  [UserRole.REGULAR]: 1,
  [UserRole.CHANNEL]: 2,
  [UserRole.INSTITUTIONAL]: 3,
  [UserRole.ADMIN]: 4,
}

/**
 * 默认角色配置
 */
export const DEFAULT_ROLE_CONFIGS: Record<UserRole, Partial<RoleConfig>> = {
  [UserRole.GUEST]: {
    allowRoleSwitch: true,
    switchableRoles: [UserRole.REGULAR],
  },
  [UserRole.REGULAR]: {
    allowRoleSwitch: true,
    switchableRoles: [UserRole.CHANNEL, UserRole.INSTITUTIONAL],
  },
  [UserRole.CHANNEL]: {
    allowRoleSwitch: true,
    switchableRoles: [UserRole.REGULAR, UserRole.INSTITUTIONAL],
  },
  [UserRole.INSTITUTIONAL]: {
    allowRoleSwitch: true,
    switchableRoles: [UserRole.REGULAR, UserRole.CHANNEL],
  },
  [UserRole.ADMIN]: {
    allowRoleSwitch: true,
    switchableRoles: Object.values(UserRole),
  },
}
