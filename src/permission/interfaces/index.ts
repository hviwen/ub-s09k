/**
 * 多角色权限管理系统 - 核心接口定义
 * @description 定义权限检查器、角色管理器等核心接口
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import type {
  AccessControlAction,
  ContentAccessConfig,
  Permission,
  PermissionAction,
  PermissionCheckResult,
  PermissionContext,
  ResourceType,
  Role,
  RoleSwitchOptions,
  RoleSwitchRecord,
  UserRole,
  UserRoleInfo,
} from '../types'

// ==================== 权限检查器接口 ====================

/**
 * 权限检查器抽象接口
 */
export interface IPermissionChecker {
  /**
   * 检查用户是否有指定权限
   * @param context 权限上下文
   * @returns 权限检查结果
   */
  checkPermission: (context: PermissionContext) => Promise<PermissionCheckResult>

  /**
   * 检查用户是否可以执行指定操作
   * @param role 用户角色
   * @param action 操作类型
   * @param resourceType 资源类型
   * @param resourceId 资源ID
   * @returns 是否有权限
   */
  hasPermission: (
    role: UserRole,
    action: PermissionAction,
    resourceType: ResourceType,
    resourceId: string
  ) => Promise<boolean>

  /**
   * 批量检查权限
   * @param contexts 权限上下文数组
   * @returns 权限检查结果数组
   */
  batchCheckPermissions: (contexts: PermissionContext[]) => Promise<PermissionCheckResult[]>

  /**
   * 获取角色的所有权限
   * @param role 用户角色
   * @returns 权限列表
   */
  getRolePermissions: (role: UserRole) => Promise<Permission[]>
}

/**
 * 内容访问控制器接口
 */
export interface IContentAccessController {
  /**
   * 检查内容访问权限
   * @param contentId 内容ID
   * @param role 用户角色
   * @param context 额外上下文
   * @returns 访问控制动作
   */
  checkContentAccess: (
    contentId: string,
    role: UserRole,
    context?: any
  ) => Promise<AccessControlAction>

  /**
   * 注册内容访问规则
   * @param config 内容访问配置
   */
  registerContentAccessRule: (config: ContentAccessConfig) => void

  /**
   * 批量检查内容访问权限
   * @param contentIds 内容ID数组
   * @param role 用户角色
   * @returns 访问控制动作映射
   */
  batchCheckContentAccess: (
    contentIds: string[],
    role: UserRole
  ) => Promise<Record<string, AccessControlAction>>
}

// ==================== 角色管理器接口 ====================

/**
 * 角色管理器接口
 */
export interface IRoleManager {
  /**
   * 获取用户当前角色信息
   * @param userId 用户ID
   * @returns 用户角色信息
   */
  getCurrentUserRole: (userId: string | number) => Promise<UserRoleInfo | null>

  /**
   * 切换用户角色
   * @param userId 用户ID
   * @param options 切换选项
   * @returns 切换结果
   */
  switchRole: (userId: string | number, options: RoleSwitchOptions) => Promise<boolean>

  /**
   * 获取用户可用角色列表
   * @param userId 用户ID
   * @returns 可用角色列表
   */
  getAvailableRoles: (userId: string | number) => Promise<Role[]>

  /**
   * 添加用户角色
   * @param userId 用户ID
   * @param role 角色信息
   * @returns 是否成功
   */
  addUserRole: (userId: string | number, role: Role) => Promise<boolean>

  /**
   * 移除用户角色
   * @param userId 用户ID
   * @param roleType 角色类型
   * @returns 是否成功
   */
  removeUserRole: (userId: string | number, roleType: UserRole) => Promise<boolean>

  /**
   * 获取角色切换历史
   * @param userId 用户ID
   * @param limit 限制数量
   * @returns 切换历史记录
   */
  getRoleSwitchHistory: (userId: string | number, limit?: number) => Promise<RoleSwitchRecord[]>

  /**
   * 验证角色切换是否合法
   * @param fromRole 源角色
   * @param toRole 目标角色
   * @returns 是否合法
   */
  validateRoleSwitch: (fromRole: UserRole, toRole: UserRole) => boolean
}

// ==================== 状态管理器接口 ====================

/**
 * 权限状态管理器接口
 */
export interface IPermissionStateManager {
  /**
   * 初始化权限状态
   * @param userId 用户ID
   */
  initializeState: (userId: string | number) => Promise<void>

  /**
   * 更新用户角色状态
   * @param userId 用户ID
   * @param roleInfo 角色信息
   */
  updateUserRoleState: (userId: string | number, roleInfo: UserRoleInfo) => Promise<void>

  /**
   * 清除用户权限状态
   * @param userId 用户ID
   */
  clearUserState: (userId: string | number) => Promise<void>

  /**
   * 获取权限状态
   * @param userId 用户ID
   * @returns 用户角色信息
   */
  getPermissionState: (userId: string | number) => Promise<UserRoleInfo | null>

  /**
   * 监听权限状态变化
   * @param callback 回调函数
   * @returns 取消监听函数
   */
  onStateChange: (callback: (userId: string | number, roleInfo: UserRoleInfo) => void) => () => void
}

// ==================== 缓存管理器接口 ====================

/**
 * 权限缓存管理器接口
 */
export interface IPermissionCacheManager {
  /**
   * 获取缓存的权限检查结果
   * @param key 缓存键
   * @returns 权限检查结果
   */
  getPermissionCache: (key: string) => Promise<PermissionCheckResult | null>

  /**
   * 设置权限检查结果缓存
   * @param key 缓存键
   * @param result 权限检查结果
   * @param ttl 过期时间（毫秒）
   */
  setPermissionCache: (key: string, result: PermissionCheckResult, ttl?: number) => Promise<void>

  /**
   * 清除权限缓存
   * @param pattern 缓存键模式
   */
  clearPermissionCache: (pattern?: string) => Promise<void>

  /**
   * 获取角色权限缓存
   * @param role 用户角色
   * @returns 权限列表
   */
  getRolePermissionsCache: (role: UserRole) => Promise<Permission[] | null>

  /**
   * 设置角色权限缓存
   * @param role 用户角色
   * @param permissions 权限列表
   * @param ttl 过期时间（毫秒）
   */
  setRolePermissionsCache: (role: UserRole, permissions: Permission[], ttl?: number) => Promise<void>

  /**
   * 预热权限缓存
   * @param roles 角色列表
   */
  warmupCache: (roles: UserRole[]) => Promise<void>
}

// ==================== API服务接口 ====================

/**
 * 权限API服务接口
 */
export interface IPermissionApiService {
  /**
   * 获取用户角色信息
   * @param userId 用户ID
   * @returns 用户角色信息
   */
  fetchUserRoles: (userId: string | number) => Promise<UserRoleInfo>

  /**
   * 获取角色权限列表
   * @param role 用户角色
   * @returns 权限列表
   */
  fetchRolePermissions: (role: UserRole) => Promise<Permission[]>

  /**
   * 申请角色切换
   * @param userId 用户ID
   * @param targetRole 目标角色
   * @param reason 申请原因
   * @returns 申请结果
   */
  requestRoleSwitch: (
    userId: string | number,
    targetRole: UserRole,
    reason?: string
  ) => Promise<{ success: boolean, message?: string }>

  /**
   * 验证权限
   * @param context 权限上下文
   * @returns 验证结果
   */
  validatePermission: (context: PermissionContext) => Promise<PermissionCheckResult>

  /**
   * 获取内容访问规则
   * @param contentId 内容ID
   * @returns 访问规则配置
   */
  fetchContentAccessRules: (contentId: string) => Promise<ContentAccessConfig>
}

// ==================== 路由权限守卫接口 ====================

/**
 * 路由权限守卫接口
 */
export interface IRoutePermissionGuard {
  /**
   * 检查页面访问权限
   * @param path 页面路径
   * @param role 用户角色
   * @returns 是否允许访问
   */
  checkPageAccess: (path: string, role: UserRole) => Promise<boolean>

  /**
   * 获取页面重定向URL
   * @param path 原始页面路径
   * @param role 用户角色
   * @returns 重定向URL
   */
  getRedirectUrl: (path: string, role: UserRole) => Promise<string | null>

  /**
   * 注册页面权限规则
   * @param path 页面路径
   * @param requiredRoles 需要的角色
   * @param redirectUrl 重定向URL
   */
  registerPageRule: (path: string, requiredRoles: UserRole[], redirectUrl?: string) => void

  /**
   * 批量注册页面权限规则
   * @param rules 权限规则映射
   */
  batchRegisterPageRules: (rules: Record<string, { roles: UserRole[], redirect?: string }>) => void
}

// ==================== 组件权限装饰器接口 ====================

/**
 * 组件权限装饰器接口
 */
export interface IComponentPermissionDecorator {
  /**
   * 检查组件是否可见
   * @param componentId 组件ID
   * @param role 用户角色
   * @returns 是否可见
   */
  isComponentVisible: (componentId: string, role: UserRole) => Promise<boolean>

  /**
   * 检查组件是否可交互
   * @param componentId 组件ID
   * @param role 用户角色
   * @returns 是否可交互
   */
  isComponentInteractive: (componentId: string, role: UserRole) => Promise<boolean>

  /**
   * 获取组件权限配置
   * @param componentId 组件ID
   * @returns 权限配置
   */
  getComponentPermissionConfig: (componentId: string) => Promise<any>

  /**
   * 注册组件权限规则
   * @param componentId 组件ID
   * @param config 权限配置
   */
  registerComponentRule: (componentId: string, config: any) => void
}

// ==================== 事件接口定义 ====================

/**
 * 权限事件接口
 */
export interface IPermissionEvent {
  /** 事件类型 */
  type: string
  /** 事件数据 */
  data: any
  /** 事件时间戳 */
  timestamp: number
}

/**
 * 权限事件监听器接口
 */
export interface IPermissionEventListener {
  /**
   * 处理权限事件
   * @param event 权限事件
   */
  handleEvent: (event: IPermissionEvent) => void
}

/**
 * 权限事件管理器接口
 */
export interface IPermissionEventManager {
  /**
   * 注册事件监听器
   * @param eventType 事件类型
   * @param listener 监听器
   */
  addEventListener: (eventType: string, listener: IPermissionEventListener) => void

  /**
   * 移除事件监听器
   * @param eventType 事件类型
   * @param listener 监听器
   */
  removeEventListener: (eventType: string, listener: IPermissionEventListener) => void

  /**
   * 触发事件
   * @param event 权限事件
   */
  emitEvent: (event: IPermissionEvent) => void
}
