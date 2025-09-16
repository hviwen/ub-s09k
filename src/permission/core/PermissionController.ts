/**
 * 权限控制器 - RBAC模型实现
 * @description 基于角色的访问控制，支持页面级、组件级、操作级权限控制
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import type { IContentAccessController, IPermissionChecker } from '../interfaces'
import type { ContentAccessConfig, Permission, PermissionCheckResult, PermissionContext } from '../types'
import { PermissionStrategyFactory } from '../strategies'
import { AccessControlAction, PermissionAction, ResourceType, UserRole } from '../types'

// ==================== 权限规则定义 ====================

/**
 * 权限规则接口
 */
interface PermissionRule {
  id: string
  resourceType: ResourceType
  resourcePattern: string // 支持通配符
  requiredRoles: UserRole[]
  requiredActions: PermissionAction[]
  conditions?: (context: PermissionContext) => boolean
  priority: number
}

/**
 * 权限检查缓存项
 */
interface PermissionCacheItem {
  result: PermissionCheckResult
  timestamp: number
  ttl: number
}

// ==================== 权限控制器实现 ====================

/**
 * 权限控制器
 */
export class PermissionController implements IPermissionChecker, IContentAccessController {
  private permissionRules: Map<string, PermissionRule[]>
  private contentAccessRules: Map<string, ContentAccessConfig>
  private permissionCache: Map<string, PermissionCacheItem>
  private cacheTimeout: number
  private debugMode: boolean

  constructor(options: { cacheTimeout?: number; debugMode?: boolean } = {}) {
    this.permissionRules = new Map()
    this.contentAccessRules = new Map()
    this.permissionCache = new Map()
    this.cacheTimeout = options.cacheTimeout || 5 * 60 * 1000 // 5分钟
    this.debugMode = options.debugMode || false

    this.initializeDefaultRules()
  }

  /**
   * 初始化默认权限规则
   */
  private initializeDefaultRules(): void {
    // 页面级权限规则
    this.registerPermissionRule({
      id: 'page_login_access',
      resourceType: ResourceType.PAGE,
      resourcePattern: '/pages/login/*',
      requiredRoles: [UserRole.GUEST],
      requiredActions: [PermissionAction.VIEW],
      priority: 1,
    })

    this.registerPermissionRule({
      id: 'page_admin_access',
      resourceType: ResourceType.PAGE,
      resourcePattern: '/pages/admin/*',
      requiredRoles: [UserRole.ADMIN],
      requiredActions: [PermissionAction.VIEW],
      priority: 10,
    })

    // API级权限规则
    this.registerPermissionRule({
      id: 'api_user_management',
      resourceType: ResourceType.API,
      resourcePattern: '/api/users/*',
      requiredRoles: [UserRole.ADMIN, UserRole.INSTITUTIONAL],
      requiredActions: [PermissionAction.VIEW, PermissionAction.EDIT],
      priority: 5,
    })

    // 内容级权限规则
    this.registerPermissionRule({
      id: 'content_premium_access',
      resourceType: ResourceType.CONTENT,
      resourcePattern: 'premium_*',
      requiredRoles: [UserRole.CHANNEL, UserRole.INSTITUTIONAL, UserRole.ADMIN],
      requiredActions: [PermissionAction.VIEW],
      priority: 3,
    })
  }

  /**
   * 注册权限规则
   */
  registerPermissionRule(rule: PermissionRule): void {
    const resourceKey = `${rule.resourceType}:${rule.resourcePattern}`

    if (!this.permissionRules.has(resourceKey)) {
      this.permissionRules.set(resourceKey, [])
    }

    const rules = this.permissionRules.get(resourceKey)!
    rules.push(rule)

    // 按优先级排序
    rules.sort((a, b) => b.priority - a.priority)

    if (this.debugMode) {
      console.log(`注册权限规则: ${rule.id}`, rule)
    }
  }

  /**
   * 批量注册权限规则
   */
  batchRegisterPermissionRules(rules: PermissionRule[]): void {
    rules.forEach(rule => this.registerPermissionRule(rule))
  }

  /**
   * 检查权限
   */
  async checkPermission(context: PermissionContext): Promise<PermissionCheckResult> {
    try {
      // 生成缓存键
      const cacheKey = this.generateCacheKey(context)

      // 检查缓存
      const cachedResult = this.getFromCache(cacheKey)
      if (cachedResult) {
        if (this.debugMode) {
          console.log(`权限检查缓存命中: ${cacheKey}`)
        }
        return cachedResult
      }

      // 执行权限检查
      const result = await this.doCheckPermission(context)

      // 缓存结果
      this.setCache(cacheKey, result)

      if (this.debugMode) {
        console.log(`权限检查结果:`, { context, result })
      }

      return result
    } catch (error) {
      console.error('权限检查失败:', error)
      return {
        hasPermission: false,
        action: AccessControlAction.COMPLETE_RESTRICTION,
        message: '权限检查异常',
      }
    }
  }

  /**
   * 执行权限检查的核心逻辑
   */
  private async doCheckPermission(context: PermissionContext): Promise<PermissionCheckResult> {
    const { userRole, resource, action } = context

    if (!userRole || !userRole.currentRole) {
      return {
        hasPermission: false,
        action: AccessControlAction.LOGIN_GUIDANCE,
        message: '用户未登录',
        redirectUrl: '/pages/login/login',
      }
    }

    const currentRole = userRole.currentRole.type

    // 使用策略模式进行权限检查
    const strategy = PermissionStrategyFactory.getStrategy(currentRole)
    const strategyResult = await strategy.checkPermission(context)

    if (!strategyResult.hasPermission) {
      return strategyResult
    }

    // 检查具体的权限规则
    if (resource && action) {
      const ruleCheckResult = await this.checkPermissionRules(currentRole, resource.type, resource.id, action)
      if (!ruleCheckResult.hasPermission) {
        return ruleCheckResult
      }
    }

    return {
      hasPermission: true,
      action: AccessControlAction.UNRESTRICTED_ACCESS,
      message: '权限检查通过',
    }
  }

  /**
   * 检查权限规则
   */
  private async checkPermissionRules(
    role: UserRole,
    resourceType: ResourceType,
    resourceId: string,
    action: PermissionAction
  ): Promise<PermissionCheckResult> {
    // 查找匹配的权限规则
    const matchingRules = this.findMatchingRules(resourceType, resourceId)

    for (const rule of matchingRules) {
      // 检查角色是否匹配
      if (!rule.requiredRoles.includes(role)) {
        continue
      }

      // 检查操作是否匹配
      if (!rule.requiredActions.includes(action)) {
        continue
      }

      // 检查条件（如果有）
      if (rule.conditions) {
        const context: PermissionContext = {
          userRole: {
            userId: 'current',
            currentRole: { id: role, type: role, name: role, permissions: [], status: 'active' as any },
            availableRoles: [],
          },
          resource: { type: resourceType, id: resourceId },
          action,
        }

        if (!rule.conditions(context)) {
          continue
        }
      }

      // 规则匹配，允许访问
      return {
        hasPermission: true,
        action: AccessControlAction.UNRESTRICTED_ACCESS,
        message: `权限规则 ${rule.id} 匹配`,
      }
    }

    // 没有匹配的规则，拒绝访问
    return {
      hasPermission: false,
      action: AccessControlAction.COMPLETE_RESTRICTION,
      message: '没有匹配的权限规则',
    }
  }

  /**
   * 查找匹配的权限规则
   */
  private findMatchingRules(resourceType: ResourceType, resourceId: string): PermissionRule[] {
    const matchingRules: PermissionRule[] = []

    for (const [key, rules] of Array.from(this.permissionRules.entries())) {
      const [ruleResourceType, pattern] = key.split(':')

      if (ruleResourceType === resourceType && this.matchPattern(pattern, resourceId)) {
        matchingRules.push(...rules)
      }
    }

    // 按优先级排序
    return matchingRules.sort((a, b) => b.priority - a.priority)
  }

  /**
   * 模式匹配（支持通配符）
   */
  private matchPattern(pattern: string, value: string): boolean {
    // 简单的通配符匹配实现
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.')

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(value)
  }

  /**
   * 检查是否有指定权限
   */
  async hasPermission(
    role: UserRole,
    action: PermissionAction,
    resourceType: ResourceType,
    resourceId: string
  ): Promise<boolean> {
    const context: PermissionContext = {
      userRole: {
        userId: 'current',
        currentRole: { id: role, type: role, name: role, permissions: [], status: 'active' as any },
        availableRoles: [],
      },
      resource: { type: resourceType, id: resourceId },
      action,
    }

    const result = await this.checkPermission(context)
    return result.hasPermission
  }

  /**
   * 批量检查权限
   */
  async batchCheckPermissions(contexts: PermissionContext[]): Promise<PermissionCheckResult[]> {
    return Promise.all(contexts.map(context => this.checkPermission(context)))
  }

  /**
   * 获取角色权限
   */
  async getRolePermissions(role: UserRole): Promise<Permission[]> {
    const strategy = PermissionStrategyFactory.getStrategy(role)
    return strategy.getRolePermissions(role)
  }

  // ==================== 内容访问控制实现 ====================

  /**
   * 检查内容访问权限
   */
  async checkContentAccess(contentId: string, role: UserRole, context?: any): Promise<AccessControlAction> {
    const config = this.contentAccessRules.get(contentId)

    if (!config) {
      // 没有配置规则，使用默认策略
      return this.getDefaultContentAccessAction(role)
    }

    // 检查自定义检查器
    if (config.customChecker) {
      return config.customChecker(role, context)
    }

    // 检查角色访问规则
    const action = config.roleAccessRules[role]
    if (action !== undefined) {
      return action
    }

    // 返回默认动作
    return config.defaultAction
  }

  /**
   * 注册内容访问规则
   */
  registerContentAccessRule(config: ContentAccessConfig): void {
    this.contentAccessRules.set(config.contentId, config)

    if (this.debugMode) {
      console.log(`注册内容访问规则: ${config.contentId}`, config)
    }
  }

  /**
   * 批量检查内容访问权限
   */
  async batchCheckContentAccess(contentIds: string[], role: UserRole): Promise<Record<string, AccessControlAction>> {
    const results: Record<string, AccessControlAction> = {}

    await Promise.all(
      contentIds.map(async contentId => {
        results[contentId] = await this.checkContentAccess(contentId, role)
      })
    )

    return results
  }

  /**
   * 获取默认内容访问动作
   */
  private getDefaultContentAccessAction(role: UserRole): AccessControlAction {
    switch (role) {
      case UserRole.GUEST:
        return AccessControlAction.LOGIN_GUIDANCE
      case UserRole.REGULAR:
        return AccessControlAction.READ_ONLY
      case UserRole.CHANNEL:
      case UserRole.INSTITUTIONAL:
      case UserRole.ADMIN:
        return AccessControlAction.UNRESTRICTED_ACCESS
      default:
        return AccessControlAction.COMPLETE_RESTRICTION
    }
  }

  // ==================== 缓存管理 ====================

  /**
   * 生成缓存键
   */
  private generateCacheKey(context: PermissionContext): string {
    const { userRole, resource, action } = context
    const roleType = userRole?.currentRole?.type || 'unknown'
    const resourceInfo = resource ? `${resource.type}:${resource.id}` : 'no-resource'
    const actionInfo = action || 'no-action'

    return `perm:${roleType}:${resourceInfo}:${actionInfo}`
  }

  /**
   * 从缓存获取结果
   */
  private getFromCache(key: string): PermissionCheckResult | null {
    const item = this.permissionCache.get(key)

    if (!item) {
      return null
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.permissionCache.delete(key)
      return null
    }

    return item.result
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, result: PermissionCheckResult, ttl?: number): void {
    const item: PermissionCacheItem = {
      result,
      timestamp: Date.now(),
      ttl: ttl || this.cacheTimeout,
    }

    this.permissionCache.set(key, item)

    // 清理过期缓存
    this.cleanupExpiredCache()
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now()

    for (const [key, item] of Array.from(this.permissionCache.entries())) {
      if (now - item.timestamp > item.ttl) {
        this.permissionCache.delete(key)
      }
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.permissionCache.clear()
  }

  /**
   * 清除指定模式的缓存
   */
  clearCacheByPattern(pattern: string): void {
    const regex = new RegExp(pattern)

    for (const key of Array.from(this.permissionCache.keys())) {
      if (regex.test(key)) {
        this.permissionCache.delete(key)
      }
    }
  }
}
