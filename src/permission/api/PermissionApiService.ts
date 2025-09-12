/**
 * 权限API服务 - 与后端权限接口交互
 * @description 处理权限相关的API请求和响应
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import type { IPermissionApiService } from '../interfaces'
import type {
  ContentAccessConfig,
  Permission,
  PermissionCheckResult,
  PermissionContext,
  Role,
  RoleSwitchRecord,
  UserRole,
  UserRoleInfo,
} from '../types'
import { http } from '@/http/http'

// ==================== API响应类型定义 ====================

/**
 * 用户角色API响应
 */
interface UserRoleApiResponse {
  userId: string | number
  currentRole: RoleApiData
  availableRoles: RoleApiData[]
  switchHistory?: RoleSwitchApiData[]
  lastUpdated: number
}

/**
 * 角色API数据
 */
interface RoleApiData {
  id: string
  type: UserRole
  name: string
  description?: string
  permissions: PermissionApiData[]
  status: string
  config?: any
  createdAt?: number
  updatedAt?: number
  expiresAt?: number
}

/**
 * 权限API数据
 */
interface PermissionApiData {
  id: string
  name: string
  description?: string
  resourceType: string
  resourceId: string
  actions: string[]
  conditions?: any
  priority?: number
}

/**
 * 角色切换API数据
 */
interface RoleSwitchApiData {
  id: string
  fromRole: UserRole
  toRole: UserRole
  switchTime: number
  reason?: string
  success: boolean
}

/**
 * 权限验证API响应
 */
interface PermissionValidationApiResponse {
  hasPermission: boolean
  action: string
  message?: string
  redirectUrl?: string
  metadata?: any
}

/**
 * 内容访问规则API响应
 */
interface ContentAccessRuleApiResponse {
  contentId: string
  contentType: string
  roleAccessRules: Record<string, string>
  defaultAction: string
  conditions?: any[]
}

// ==================== 权限API服务实现 ====================

/**
 * 权限API服务
 */
export class PermissionApiService implements IPermissionApiService {
  private baseUrl: string
  private debugMode: boolean

  constructor(options: { baseUrl?: string; debugMode?: boolean } = {}) {
    this.baseUrl = options.baseUrl || '/api/permission'
    this.debugMode = options.debugMode || false
  }

  /**
   * 获取用户角色信息
   */
  async fetchUserRoles(userId: string | number): Promise<UserRoleInfo> {
    try {
      if (this.debugMode) {
        console.log(`获取用户角色信息: ${userId}`)
      }

      const response = await http.get<UserRoleApiResponse>(`${this.baseUrl}/users/${userId}/roles`)

      return this.transformUserRoleResponse(response.data)
    } catch (error) {
      console.error('获取用户角色信息失败:', error)
      throw new Error('获取用户角色信息失败')
    }
  }

  /**
   * 获取角色权限列表
   */
  async fetchRolePermissions(role: UserRole): Promise<Permission[]> {
    try {
      if (this.debugMode) {
        console.log(`获取角色权限: ${role}`)
      }

      const response = await http.get<PermissionApiData[]>(`${this.baseUrl}/roles/${role}/permissions`)

      return response.data.map(this.transformPermissionData)
    } catch (error) {
      console.error('获取角色权限失败:', error)
      throw new Error('获取角色权限失败')
    }
  }

  /**
   * 申请角色切换
   */
  async requestRoleSwitch(
    userId: string | number,
    targetRole: UserRole,
    reason?: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      if (this.debugMode) {
        console.log(`申请角色切换: ${userId} -> ${targetRole}`)
      }

      const response = await http.post<{ success: boolean; message?: string }>(
        `${this.baseUrl}/users/${userId}/role-switch`,
        {
          targetRole,
          reason,
        }
      )

      return response.data
    } catch (error) {
      console.error('申请角色切换失败:', error)
      return {
        success: false,
        message: '角色切换申请失败',
      }
    }
  }

  /**
   * 验证权限
   */
  async validatePermission(context: PermissionContext): Promise<PermissionCheckResult> {
    try {
      if (this.debugMode) {
        console.log('验证权限:', context)
      }

      const response = await http.post<PermissionValidationApiResponse>(`${this.baseUrl}/validate`, {
        userId: context.userRole.userId,
        currentRole: context.userRole.currentRole.type,
        resource: context.resource,
        action: context.action,
        extra: context.extra,
      })

      return this.transformPermissionValidationResponse(response.data)
    } catch (error) {
      console.error('权限验证失败:', error)
      return {
        hasPermission: false,
        action: 'complete_restriction' as any,
        message: '权限验证失败',
      }
    }
  }

  /**
   * 获取内容访问规则
   */
  async fetchContentAccessRules(contentId: string): Promise<ContentAccessConfig> {
    try {
      if (this.debugMode) {
        console.log(`获取内容访问规则: ${contentId}`)
      }

      const response = await http.get<ContentAccessRuleApiResponse>(`${this.baseUrl}/content/${contentId}/access-rules`)

      return this.transformContentAccessRuleResponse(response.data)
    } catch (error) {
      console.error('获取内容访问规则失败:', error)
      throw new Error('获取内容访问规则失败')
    }
  }

  /**
   * 获取用户角色切换历史
   */
  async fetchRoleSwitchHistory(userId: string | number, limit: number = 20): Promise<RoleSwitchRecord[]> {
    try {
      if (this.debugMode) {
        console.log(`获取角色切换历史: ${userId}`)
      }

      const response = await http.get<RoleSwitchApiData[]>(`${this.baseUrl}/users/${userId}/role-switch-history`, {
        limit,
      })

      return response.data.map(this.transformRoleSwitchData)
    } catch (error) {
      console.error('获取角色切换历史失败:', error)
      return []
    }
  }

  /**
   * 批量验证权限
   */
  async batchValidatePermissions(contexts: PermissionContext[]): Promise<PermissionCheckResult[]> {
    try {
      if (this.debugMode) {
        console.log('批量验证权限:', contexts.length)
      }

      const response = await http.post<PermissionValidationApiResponse[]>(`${this.baseUrl}/batch-validate`, {
        contexts: contexts.map(context => ({
          userId: context.userRole.userId,
          currentRole: context.userRole.currentRole.type,
          resource: context.resource,
          action: context.action,
          extra: context.extra,
        })),
      })

      return response.data.map(this.transformPermissionValidationResponse)
    } catch (error) {
      console.error('批量权限验证失败:', error)
      return contexts.map(() => ({
        hasPermission: false,
        action: 'complete_restriction' as any,
        message: '权限验证失败',
      }))
    }
  }

  /**
   * 同步用户角色状态到服务器
   */
  async syncUserRoleState(userId: string | number, roleInfo: UserRoleInfo): Promise<boolean> {
    try {
      if (this.debugMode) {
        console.log(`同步用户角色状态: ${userId}`)
      }

      await http.post(`${this.baseUrl}/users/${userId}/sync-role-state`, {
        currentRole: roleInfo.currentRole.type,
        lastUpdated: roleInfo.lastUpdated,
      })

      return true
    } catch (error) {
      console.error('同步用户角色状态失败:', error)
      return false
    }
  }

  /**
   * 获取权限配置
   */
  async fetchPermissionConfig(): Promise<any> {
    try {
      if (this.debugMode) {
        console.log('获取权限配置')
      }

      const response = await http.get(`${this.baseUrl}/config`)
      return response.data
    } catch (error) {
      console.error('获取权限配置失败:', error)
      return {}
    }
  }

  // ==================== 数据转换方法 ====================

  /**
   * 转换用户角色响应数据
   */
  private transformUserRoleResponse(data: UserRoleApiResponse): UserRoleInfo {
    return {
      userId: data.userId,
      currentRole: this.transformRoleData(data.currentRole),
      availableRoles: data.availableRoles.map(this.transformRoleData),
      switchHistory: data.switchHistory?.map(this.transformRoleSwitchData),
      lastUpdated: data.lastUpdated,
    }
  }

  /**
   * 转换角色数据
   */
  private transformRoleData(data: RoleApiData): Role {
    return {
      id: data.id,
      type: data.type,
      name: data.name,
      description: data.description,
      permissions: data.permissions.map(this.transformPermissionData),
      status: data.status as any,
      config: data.config,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      expiresAt: data.expiresAt,
    }
  }

  /**
   * 转换权限数据
   */
  private transformPermissionData(data: PermissionApiData): Permission {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      resourceType: data.resourceType as any,
      resourceId: data.resourceId,
      actions: data.actions as any[],
      conditions: data.conditions,
      priority: data.priority,
    }
  }

  /**
   * 转换角色切换数据
   */
  private transformRoleSwitchData(data: RoleSwitchApiData): RoleSwitchRecord {
    return {
      id: data.id,
      fromRole: data.fromRole,
      toRole: data.toRole,
      switchTime: data.switchTime,
      reason: data.reason,
      success: data.success,
    }
  }

  /**
   * 转换权限验证响应
   */
  private transformPermissionValidationResponse(data: PermissionValidationApiResponse): PermissionCheckResult {
    return {
      hasPermission: data.hasPermission,
      action: data.action as any,
      message: data.message,
      redirectUrl: data.redirectUrl,
      metadata: data.metadata,
    }
  }

  /**
   * 转换内容访问规则响应
   */
  private transformContentAccessRuleResponse(data: ContentAccessRuleApiResponse): ContentAccessConfig {
    const roleAccessRules: Record<UserRole, any> = {}

    Object.entries(data.roleAccessRules).forEach(([role, action]) => {
      roleAccessRules[role as UserRole] = action as any
    })

    return {
      contentId: data.contentId,
      contentType: data.contentType,
      roleAccessRules,
      defaultAction: data.defaultAction as any,
      customChecker: data.conditions ? this.createCustomChecker(data.conditions) : undefined,
    }
  }

  /**
   * 创建自定义检查器
   */
  private createCustomChecker(conditions: any[]): (role: UserRole, context?: any) => any {
    return (role: UserRole, context?: any) => {
      // 这里可以根据条件数组实现复杂的检查逻辑
      // 简化实现，实际项目中需要根据具体需求实现
      return 'unrestricted_access'
    }
  }
}

// ==================== 单例实例 ====================

let permissionApiServiceInstance: PermissionApiService | null = null

/**
 * 获取权限API服务单例
 */
export function getPermissionApiService(): PermissionApiService {
  if (!permissionApiServiceInstance) {
    permissionApiServiceInstance = new PermissionApiService({
      debugMode: import.meta.env.DEV,
    })
  }
  return permissionApiServiceInstance
}

/**
 * 重置权限API服务单例
 */
export function resetPermissionApiService(): void {
  permissionApiServiceInstance = null
}
