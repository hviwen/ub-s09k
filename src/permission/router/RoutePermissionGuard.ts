/**
 * 路由权限守卫 - 页面级权限控制
 * @description 集成到unibest路由系统，实现页面级权限拦截
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import type { IRoutePermissionGuard } from '../interfaces'
import type { AccessControlAction, UserRole } from '../types'

// ==================== 路由权限规则定义 ====================

/**
 * 页面权限规则
 */
interface PagePermissionRule {
  /** 页面路径模式 */
  pathPattern: string
  /** 需要的角色 */
  requiredRoles: UserRole[]
  /** 重定向URL */
  redirectUrl?: string
  /** 自定义检查函数 */
  customChecker?: (path: string, role: UserRole, context?: any) => Promise<boolean>
  /** 规则优先级 */
  priority: number
  /** 规则描述 */
  description?: string
}

/**
 * 路由权限检查结果
 */
interface RoutePermissionResult {
  /** 是否允许访问 */
  allowed: boolean
  /** 重定向URL */
  redirectUrl?: string
  /** 访问控制动作 */
  action: AccessControlAction
  /** 消息 */
  message?: string
  /** 匹配的规则 */
  matchedRule?: PagePermissionRule
}

// ==================== 路由权限守卫实现 ====================

/**
 * 路由权限守卫
 */
export class RoutePermissionGuard implements IRoutePermissionGuard {
  private pageRules: PagePermissionRule[]
  private debugMode: boolean

  constructor(options: { debugMode?: boolean } = {}) {
    this.pageRules = []
    this.debugMode = options.debugMode || false

    this.initializeDefaultRules()
  }

  /**
   * 初始化默认路由权限规则
   */
  private initializeDefaultRules(): void {
    // 登录页面 - 所有角色都可以访问
    this.registerPageRule('/pages/login/*', Object.values(UserRole))

    // 首页 - 所有角色都可以访问
    this.registerPageRule('/pages/index/*', Object.values(UserRole))

    // 关于页面 - 所有角色都可以访问
    this.registerPageRule('/pages/about/*', Object.values(UserRole))

    // 个人中心 - 需要登录
    this.registerPageRule('/pages/me/*', [
      UserRole.REGULAR,
      UserRole.CHANNEL,
      UserRole.INSTITUTIONAL,
      UserRole.ADMIN,
    ], '/pages/login/login')

    // 管理页面 - 仅管理员
    this.registerPageRule('/pages/admin/*', [UserRole.ADMIN], '/pages/login/login')

    // 机构页面 - 机构用户和管理员
    this.registerPageRule('/pages/institutional/*', [
      UserRole.INSTITUTIONAL,
      UserRole.ADMIN,
    ], '/pages/role/switch')

    // 渠道页面 - 渠道用户、机构用户和管理员
    this.registerPageRule('/pages/channel/*', [
      UserRole.CHANNEL,
      UserRole.INSTITUTIONAL,
      UserRole.ADMIN,
    ], '/pages/role/switch')

    if (this.debugMode) {
      console.log('路由权限守卫默认规则初始化完成')
    }
  }

  /**
   * 检查页面访问权限
   */
  async checkPageAccess(path: string, role: UserRole): Promise<boolean> {
    const result = await this.checkPagePermission(path, role)
    return result.allowed
  }

  /**
   * 检查页面权限（详细结果）
   */
  async checkPagePermission(path: string, role: UserRole, context?: any): Promise<RoutePermissionResult> {
    try {
      if (this.debugMode) {
        console.log(`检查页面权限: ${path}, 角色: ${role}`)
      }

      // 查找匹配的规则
      const matchedRule = this.findMatchingRule(path)

      if (!matchedRule) {
        // 没有匹配的规则，默认允许访问
        return {
          allowed: true,
          action: AccessControlAction.UNRESTRICTED_ACCESS,
          message: '没有匹配的权限规则，默认允许访问',
        }
      }

      // 检查自定义检查器
      if (matchedRule.customChecker) {
        const customResult = await matchedRule.customChecker(path, role, context)
        if (!customResult) {
          return {
            allowed: false,
            redirectUrl: matchedRule.redirectUrl,
            action: this.getAccessControlAction(role, matchedRule),
            message: '自定义权限检查失败',
            matchedRule,
          }
        }
      }

      // 检查角色权限
      if (!matchedRule.requiredRoles.includes(role)) {
        return {
          allowed: false,
          redirectUrl: matchedRule.redirectUrl,
          action: this.getAccessControlAction(role, matchedRule),
          message: `角色 ${role} 无权访问此页面`,
          matchedRule,
        }
      }

      // 权限检查通过
      return {
        allowed: true,
        action: AccessControlAction.UNRESTRICTED_ACCESS,
        message: '权限检查通过',
        matchedRule,
      }
    }
    catch (error) {
      console.error('页面权限检查失败:', error)
      return {
        allowed: false,
        action: AccessControlAction.COMPLETE_RESTRICTION,
        message: '权限检查异常',
      }
    }
  }

  /**
   * 获取页面重定向URL
   */
  async getRedirectUrl(path: string, role: UserRole): Promise<string | null> {
    const result = await this.checkPagePermission(path, role)
    return result.redirectUrl || null
  }

  /**
   * 注册页面权限规则
   */
  registerPageRule(
    pathPattern: string,
    requiredRoles: UserRole[],
    redirectUrl?: string,
    priority: number = 0,
  ): void {
    const rule: PagePermissionRule = {
      pathPattern,
      requiredRoles,
      redirectUrl,
      priority,
      description: `页面 ${pathPattern} 需要角色: ${requiredRoles.join(', ')}`,
    }

    this.pageRules.push(rule)

    // 按优先级排序
    this.pageRules.sort((a, b) => b.priority - a.priority)

    if (this.debugMode) {
      console.log(`注册页面权限规则: ${pathPattern}`, rule)
    }
  }

  /**
   * 批量注册页面权限规则
   */
  batchRegisterPageRules(rules: Record<string, { roles: UserRole[], redirect?: string, priority?: number }>): void {
    Object.entries(rules).forEach(([path, config]) => {
      this.registerPageRule(path, config.roles, config.redirect, config.priority || 0)
    })
  }

  /**
   * 注册高级页面权限规则
   */
  registerAdvancedPageRule(rule: PagePermissionRule): void {
    this.pageRules.push(rule)

    // 按优先级排序
    this.pageRules.sort((a, b) => b.priority - a.priority)

    if (this.debugMode) {
      console.log(`注册高级页面权限规则: ${rule.pathPattern}`, rule)
    }
  }

  /**
   * 查找匹配的规则
   */
  private findMatchingRule(path: string): PagePermissionRule | null {
    for (const rule of this.pageRules) {
      if (this.matchPath(rule.pathPattern, path)) {
        return rule
      }
    }
    return null
  }

  /**
   * 路径匹配
   */
  private matchPath(pattern: string, path: string): boolean {
    // 精确匹配
    if (pattern === path) {
      return true
    }

    // 通配符匹配
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')

      const regex = new RegExp(`^${regexPattern}$`)
      return regex.test(path)
    }

    // 前缀匹配
    if (pattern.endsWith('/') && path.startsWith(pattern)) {
      return true
    }

    return false
  }

  /**
   * 获取访问控制动作
   */
  private getAccessControlAction(role: UserRole, rule: PagePermissionRule): AccessControlAction {
    // 根据角色和规则确定访问控制动作
    if (role === UserRole.GUEST) {
      return AccessControlAction.LOGIN_GUIDANCE
    }

    // 检查是否需要角色切换
    const hasHigherRole = rule.requiredRoles.some((requiredRole) => {
      return this.isHigherRole(requiredRole, role)
    })

    if (hasHigherRole) {
      return AccessControlAction.ROLE_SWITCH_GUIDANCE
    }

    return AccessControlAction.COMPLETE_RESTRICTION
  }

  /**
   * 判断是否为更高级角色
   */
  private isHigherRole(targetRole: UserRole, currentRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.GUEST]: 0,
      [UserRole.REGULAR]: 1,
      [UserRole.CHANNEL]: 2,
      [UserRole.INSTITUTIONAL]: 3,
      [UserRole.ADMIN]: 4,
    }

    return roleHierarchy[targetRole] > roleHierarchy[currentRole]
  }

  /**
   * 移除页面权限规则
   */
  removePageRule(pathPattern: string): boolean {
    const index = this.pageRules.findIndex(rule => rule.pathPattern === pathPattern)
    if (index !== -1) {
      this.pageRules.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * 获取所有页面权限规则
   */
  getAllPageRules(): PagePermissionRule[] {
    return [...this.pageRules]
  }

  /**
   * 清除所有页面权限规则
   */
  clearAllPageRules(): void {
    this.pageRules = []
  }

  /**
   * 获取页面权限规则统计
   */
  getPageRuleStats(): {
    totalRules: number
    rulesByRole: Record<UserRole, number>
    rulesWithRedirect: number
  } {
    const stats = {
      totalRules: this.pageRules.length,
      rulesByRole: {} as Record<UserRole, number>,
      rulesWithRedirect: 0,
    }

    // 初始化角色统计
    Object.values(UserRole).forEach((role) => {
      stats.rulesByRole[role] = 0
    })

    // 统计规则
    this.pageRules.forEach((rule) => {
      rule.requiredRoles.forEach((role) => {
        stats.rulesByRole[role]++
      })

      if (rule.redirectUrl) {
        stats.rulesWithRedirect++
      }
    })

    return stats
  }
}

// ==================== 路由权限守卫单例 ====================

let routePermissionGuardInstance: RoutePermissionGuard | null = null

/**
 * 获取路由权限守卫单例
 */
export function getRoutePermissionGuard(): RoutePermissionGuard {
  if (!routePermissionGuardInstance) {
    routePermissionGuardInstance = new RoutePermissionGuard({
      debugMode: import.meta.env.DEV,
    })
  }
  return routePermissionGuardInstance
}

/**
 * 重置路由权限守卫单例
 */
export function resetRoutePermissionGuard(): void {
  routePermissionGuardInstance = null
}
