/**
 * 多角色权限管理系统 - 权限检查策略实现
 * @description 实现不同角色的权限检查策略（策略模式）
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import type { IPermissionChecker } from '../interfaces'
import type { Permission, PermissionCheckResult, PermissionContext } from '../types'
import { AccessControlAction, PermissionAction, ResourceType, UserRole } from '../types'

// ==================== 抽象策略基类 ====================

/**
 * 权限检查策略抽象基类
 */
export abstract class BasePermissionStrategy implements IPermissionChecker {
  protected role: UserRole

  constructor(role: UserRole) {
    this.role = role
  }

  /**
   * 检查权限的核心方法（模板方法）
   */
  async checkPermission(context: PermissionContext): Promise<PermissionCheckResult> {
    try {
      // 1. 预检查
      const preCheckResult = await this.preCheck(context)
      if (!preCheckResult.hasPermission) {
        return preCheckResult
      }

      // 2. 具体权限检查
      const permissionResult = await this.doCheckPermission(context)
      if (!permissionResult.hasPermission) {
        return permissionResult
      }

      // 3. 后置检查
      return await this.postCheck(context, permissionResult)
    } catch (error) {
      console.error(`权限检查失败 [${this.role}]:`, error)
      return {
        hasPermission: false,
        action: AccessControlAction.COMPLETE_RESTRICTION,
        message: '权限检查异常，请稍后重试',
      }
    }
  }

  /**
   * 预检查（可被子类重写）
   */
  protected async preCheck(context: PermissionContext): Promise<PermissionCheckResult> {
    return {
      hasPermission: true,
      action: AccessControlAction.UNRESTRICTED_ACCESS,
    }
  }

  /**
   * 具体权限检查（必须被子类实现）
   */
  protected abstract doCheckPermission(context: PermissionContext): Promise<PermissionCheckResult>

  /**
   * 后置检查（可被子类重写）
   */
  protected async postCheck(context: PermissionContext, result: PermissionCheckResult): Promise<PermissionCheckResult> {
    return result
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
   * 获取角色权限（默认实现）
   */
  async getRolePermissions(role: UserRole): Promise<Permission[]> {
    // 默认返回空数组，子类可以重写
    return []
  }

  /**
   * 创建权限检查结果的辅助方法
   */
  protected createResult(
    hasPermission: boolean,
    action: AccessControlAction,
    message?: string,
    redirectUrl?: string,
    metadata?: Record<string, any>
  ): PermissionCheckResult {
    return {
      hasPermission,
      action,
      message,
      redirectUrl,
      metadata,
    }
  }
}

// ==================== 具体策略实现 ====================

/**
 * 游客用户权限策略
 */
export class GuestPermissionStrategy extends BasePermissionStrategy {
  constructor() {
    super(UserRole.GUEST)
  }

  protected async doCheckPermission(context: PermissionContext): Promise<PermissionCheckResult> {
    const { resource, action } = context

    // 游客只能查看公开内容
    if (action === PermissionAction.VIEW && resource?.type === ResourceType.CONTENT) {
      return this.createResult(true, AccessControlAction.READ_ONLY, '游客只能查看内容，无法进行其他操作')
    }

    // 其他操作需要登录
    return this.createResult(false, AccessControlAction.LOGIN_GUIDANCE, '请先登录以获取更多权限', '/pages/login/login')
  }

  async getRolePermissions(): Promise<Permission[]> {
    return [
      {
        id: 'guest_view_public_content',
        name: '查看公开内容',
        resourceType: ResourceType.CONTENT,
        resourceId: 'public',
        actions: [PermissionAction.VIEW],
      },
    ]
  }
}

/**
 * 普通用户权限策略
 */
export class RegularUserPermissionStrategy extends BasePermissionStrategy {
  constructor() {
    super(UserRole.REGULAR)
  }

  protected async doCheckPermission(context: PermissionContext): Promise<PermissionCheckResult> {
    const { resource, action } = context

    // 普通用户可以查看、分享、收藏内容
    if (resource?.type === ResourceType.CONTENT) {
      const allowedActions = [
        PermissionAction.VIEW,
        PermissionAction.SHARE,
        PermissionAction.FAVORITE,
        PermissionAction.COMMENT,
      ]

      if (allowedActions.includes(action!)) {
        return this.createResult(
          true,
          AccessControlAction.UNRESTRICTED_ACCESS,
          '普通用户可以查看、分享、收藏和评论内容'
        )
      }
    }

    // 其他高级操作需要更高权限
    return this.createResult(
      false,
      AccessControlAction.ROLE_SWITCH_GUIDANCE,
      '该操作需要更高权限，请切换到相应角色',
      '/pages/role/switch'
    )
  }

  async getRolePermissions(): Promise<Permission[]> {
    return [
      {
        id: 'regular_view_content',
        name: '查看内容',
        resourceType: ResourceType.CONTENT,
        resourceId: '*',
        actions: [PermissionAction.VIEW],
      },
      {
        id: 'regular_interact_content',
        name: '内容交互',
        resourceType: ResourceType.CONTENT,
        resourceId: '*',
        actions: [PermissionAction.SHARE, PermissionAction.FAVORITE, PermissionAction.COMMENT],
      },
    ]
  }
}

/**
 * 渠道用户权限策略
 */
export class ChannelUserPermissionStrategy extends BasePermissionStrategy {
  constructor() {
    super(UserRole.CHANNEL)
  }

  protected async doCheckPermission(context: PermissionContext): Promise<PermissionCheckResult> {
    const { resource, action } = context

    // 渠道用户拥有普通用户的所有权限，还可以下载和创建内容
    if (resource?.type === ResourceType.CONTENT) {
      const allowedActions = [
        PermissionAction.VIEW,
        PermissionAction.SHARE,
        PermissionAction.FAVORITE,
        PermissionAction.COMMENT,
        PermissionAction.DOWNLOAD,
        PermissionAction.CREATE,
      ]

      if (allowedActions.includes(action!)) {
        return this.createResult(true, AccessControlAction.UNRESTRICTED_ACCESS, '渠道用户拥有内容的完整操作权限')
      }
    }

    // 管理类操作需要更高权限
    if (action === PermissionAction.DELETE || action === PermissionAction.EDIT) {
      return this.createResult(
        false,
        AccessControlAction.ROLE_SWITCH_GUIDANCE,
        '管理操作需要机构用户或管理员权限',
        '/pages/role/switch'
      )
    }

    return this.createResult(true, AccessControlAction.UNRESTRICTED_ACCESS)
  }

  async getRolePermissions(): Promise<Permission[]> {
    return [
      {
        id: 'channel_full_content_access',
        name: '完整内容访问',
        resourceType: ResourceType.CONTENT,
        resourceId: '*',
        actions: [
          PermissionAction.VIEW,
          PermissionAction.SHARE,
          PermissionAction.FAVORITE,
          PermissionAction.COMMENT,
          PermissionAction.DOWNLOAD,
          PermissionAction.CREATE,
        ],
      },
    ]
  }
}

/**
 * 机构用户权限策略
 */
export class InstitutionalUserPermissionStrategy extends BasePermissionStrategy {
  constructor() {
    super(UserRole.INSTITUTIONAL)
  }

  protected async doCheckPermission(context: PermissionContext): Promise<PermissionCheckResult> {
    const { resource, action } = context

    // 机构用户拥有所有内容权限
    if (resource?.type === ResourceType.CONTENT) {
      return this.createResult(true, AccessControlAction.UNRESTRICTED_ACCESS, '机构用户拥有所有内容操作权限')
    }

    // 系统管理权限需要管理员角色
    if (resource?.type === ResourceType.MODULE && action === PermissionAction.EDIT) {
      return this.createResult(
        false,
        AccessControlAction.ROLE_SWITCH_GUIDANCE,
        '系统管理需要管理员权限',
        '/pages/role/switch'
      )
    }

    return this.createResult(true, AccessControlAction.UNRESTRICTED_ACCESS)
  }

  async getRolePermissions(): Promise<Permission[]> {
    return [
      {
        id: 'institutional_all_content',
        name: '所有内容权限',
        resourceType: ResourceType.CONTENT,
        resourceId: '*',
        actions: Object.values(PermissionAction),
      },
      {
        id: 'institutional_api_access',
        name: 'API访问权限',
        resourceType: ResourceType.API,
        resourceId: '*',
        actions: [PermissionAction.VIEW, PermissionAction.CREATE],
      },
    ]
  }
}

/**
 * 管理员权限策略
 */
export class AdminPermissionStrategy extends BasePermissionStrategy {
  constructor() {
    super(UserRole.ADMIN)
  }

  protected async doCheckPermission(context: PermissionContext): Promise<PermissionCheckResult> {
    // 管理员拥有所有权限
    return this.createResult(true, AccessControlAction.UNRESTRICTED_ACCESS, '管理员拥有系统所有权限')
  }

  async getRolePermissions(): Promise<Permission[]> {
    return [
      {
        id: 'admin_full_access',
        name: '完全访问权限',
        resourceType: ResourceType.PAGE,
        resourceId: '*',
        actions: Object.values(PermissionAction),
      },
      {
        id: 'admin_system_management',
        name: '系统管理权限',
        resourceType: ResourceType.MODULE,
        resourceId: '*',
        actions: Object.values(PermissionAction),
      },
    ]
  }
}

// ==================== 策略工厂 ====================

/**
 * 权限策略工厂
 */
export class PermissionStrategyFactory {
  private static strategies = new Map<UserRole, BasePermissionStrategy>()

  /**
   * 获取权限策略实例
   */
  static getStrategy(role: UserRole): BasePermissionStrategy {
    if (!this.strategies.has(role)) {
      this.strategies.set(role, this.createStrategy(role))
    }
    return this.strategies.get(role)!
  }

  /**
   * 创建权限策略实例
   */
  private static createStrategy(role: UserRole): BasePermissionStrategy {
    switch (role) {
      case UserRole.GUEST:
        return new GuestPermissionStrategy()
      case UserRole.REGULAR:
        return new RegularUserPermissionStrategy()
      case UserRole.CHANNEL:
        return new ChannelUserPermissionStrategy()
      case UserRole.INSTITUTIONAL:
        return new InstitutionalUserPermissionStrategy()
      case UserRole.ADMIN:
        return new AdminPermissionStrategy()
      default:
        throw new Error(`不支持的角色类型: ${role}`)
    }
  }

  /**
   * 清除策略缓存
   */
  static clearCache(): void {
    this.strategies.clear()
  }

  /**
   * 预加载所有策略
   */
  static preloadStrategies(): void {
    Object.values(UserRole).forEach(role => {
      this.getStrategy(role)
    })
  }
}
