/**
 * 角色切换服务 - 基于观察者模式实现
 * @description 处理角色切换逻辑，通知相关组件更新
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import type { IRoleManager } from '../interfaces'
import type { Role, RoleSwitchOptions, RoleSwitchRecord, UserRole, UserRoleInfo } from '../types'
import { RoleStateManager } from './RoleStateManager'

// ==================== 事件定义 ====================

/**
 * 角色切换事件类型
 */
export enum RoleSwitchEventType {
  /** 角色切换开始 */
  SWITCH_START = 'switch_start',
  /** 角色切换成功 */
  SWITCH_SUCCESS = 'switch_success',
  /** 角色切换失败 */
  SWITCH_FAILED = 'switch_failed',
  /** 角色切换取消 */
  SWITCH_CANCELLED = 'switch_cancelled',
  /** 角色权限更新 */
  PERMISSIONS_UPDATED = 'permissions_updated',
}

/**
 * 角色切换事件数据
 */
export interface RoleSwitchEvent {
  type: RoleSwitchEventType
  userId: string | number
  fromRole?: UserRole
  toRole?: UserRole
  timestamp: number
  data?: any
  error?: Error
}

/**
 * 角色切换监听器接口
 */
export interface IRoleSwitchListener {
  onRoleSwitchEvent: (event: RoleSwitchEvent) => void
}

// ==================== 角色切换服务 ====================

/**
 * 角色切换服务
 */
export class RoleSwitchService implements IRoleManager {
  private roleStateManager: RoleStateManager
  private listeners: Set<IRoleSwitchListener>
  private switchQueue: Map<string | number, Promise<boolean>>
  private switchLocks: Set<string | number>

  constructor() {
    this.roleStateManager = new RoleStateManager()
    this.listeners = new Set()
    this.switchQueue = new Map()
    this.switchLocks = new Set()
  }

  /**
   * 添加角色切换监听器
   */
  addListener(listener: IRoleSwitchListener): void {
    this.listeners.add(listener)
  }

  /**
   * 移除角色切换监听器
   */
  removeListener(listener: IRoleSwitchListener): void {
    this.listeners.delete(listener)
  }

  /**
   * 触发角色切换事件
   */
  private emitEvent(event: RoleSwitchEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener.onRoleSwitchEvent(event)
      } catch (error) {
        console.error('角色切换事件监听器执行失败:', error)
      }
    })
  }

  /**
   * 获取用户当前角色信息
   */
  async getCurrentUserRole(userId: string | number): Promise<UserRoleInfo | null> {
    return this.roleStateManager.getCurrentUserRole(userId)
  }

  /**
   * 切换用户角色（带队列和锁机制）
   */
  async switchRole(userId: string | number, options: RoleSwitchOptions): Promise<boolean> {
    const userKey = String(userId)

    // 检查是否已有切换操作在进行
    if (this.switchLocks.has(userKey)) {
      console.warn(`用户 ${userId} 的角色切换操作正在进行中`)
      return false
    }

    // 检查队列中是否已有相同的切换操作
    const existingSwitch = this.switchQueue.get(userKey)
    if (existingSwitch) {
      console.log(`用户 ${userId} 的角色切换操作已在队列中，等待完成`)
      return existingSwitch
    }

    // 创建切换操作
    const switchPromise = this.performRoleSwitch(userId, options)
    this.switchQueue.set(userKey, switchPromise)

    try {
      const result = await switchPromise
      return result
    } finally {
      // 清理队列和锁
      this.switchQueue.delete(userKey)
      this.switchLocks.delete(userKey)
    }
  }

  /**
   * 执行角色切换操作
   */
  private async performRoleSwitch(userId: string | number, options: RoleSwitchOptions): Promise<boolean> {
    const userKey = String(userId)
    this.switchLocks.add(userKey)

    try {
      // 获取当前角色信息
      const currentRoleInfo = await this.getCurrentUserRole(userId)
      if (!currentRoleInfo) {
        throw new Error('用户角色信息不存在')
      }

      const fromRole = currentRoleInfo.currentRole.type
      const toRole = options.targetRole

      // 触发切换开始事件
      this.emitEvent({
        type: RoleSwitchEventType.SWITCH_START,
        userId,
        fromRole,
        toRole,
        timestamp: Date.now(),
        data: { reason: options.reason },
      })

      // 验证切换合法性
      if (!this.validateRoleSwitch(fromRole, toRole)) {
        throw new Error(`不允许从 ${fromRole} 切换到 ${toRole}`)
      }

      // 检查目标角色是否可用
      const targetRole = currentRoleInfo.availableRoles.find(role => role.type === toRole)
      if (!targetRole) {
        throw new Error(`目标角色 ${toRole} 不在用户可用角色列表中`)
      }

      // 执行预切换检查
      const preCheckResult = await this.preRoleSwitchCheck(userId, fromRole, toRole)
      if (!preCheckResult.success) {
        throw new Error(preCheckResult.message || '预切换检查失败')
      }

      // 执行角色切换
      const switchResult = await this.roleStateManager.switchRole(userId, {
        ...options,
        onSuccess: (newRole: Role) => {
          // 触发切换成功事件
          this.emitEvent({
            type: RoleSwitchEventType.SWITCH_SUCCESS,
            userId,
            fromRole,
            toRole: newRole.type,
            timestamp: Date.now(),
            data: { newRole },
          })

          // 触发权限更新事件
          this.emitEvent({
            type: RoleSwitchEventType.PERMISSIONS_UPDATED,
            userId,
            toRole: newRole.type,
            timestamp: Date.now(),
            data: { permissions: newRole.permissions },
          })

          // 执行原始成功回调
          if (options.onSuccess) {
            options.onSuccess(newRole)
          }
        },
        onError: (error: Error) => {
          // 触发切换失败事件
          this.emitEvent({
            type: RoleSwitchEventType.SWITCH_FAILED,
            userId,
            fromRole,
            toRole,
            timestamp: Date.now(),
            error,
          })

          // 执行原始错误回调
          if (options.onError) {
            options.onError(error)
          }
        },
      })

      if (switchResult) {
        // 执行后切换处理
        await this.postRoleSwitchProcess(userId, fromRole, toRole)
      }

      return switchResult
    } catch (error) {
      console.error('角色切换失败:', error)

      // 触发切换失败事件
      this.emitEvent({
        type: RoleSwitchEventType.SWITCH_FAILED,
        userId,
        fromRole: currentRoleInfo?.currentRole.type,
        toRole: options.targetRole,
        timestamp: Date.now(),
        error: error as Error,
      })

      return false
    }
  }

  /**
   * 预切换检查
   */
  private async preRoleSwitchCheck(
    userId: string | number,
    fromRole: UserRole,
    toRole: UserRole
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // 检查用户状态
      const userStatus = await this.checkUserStatus(userId)
      if (!userStatus.isActive) {
        return { success: false, message: '用户状态异常，无法切换角色' }
      }

      // 检查角色状态
      const roleStatus = await this.checkRoleStatus(toRole)
      if (!roleStatus.isAvailable) {
        return { success: false, message: `目标角色 ${toRole} 当前不可用` }
      }

      // 检查业务规则
      const businessCheck = await this.checkBusinessRules(userId, fromRole, toRole)
      if (!businessCheck.success) {
        return { success: false, message: businessCheck.message }
      }

      return { success: true }
    } catch (error) {
      console.error('预切换检查失败:', error)
      return { success: false, message: '预切换检查异常' }
    }
  }

  /**
   * 后切换处理
   */
  private async postRoleSwitchProcess(userId: string | number, fromRole: UserRole, toRole: UserRole): Promise<void> {
    try {
      // 清理旧角色相关缓存
      await this.clearRoleCache(userId, fromRole)

      // 预加载新角色数据
      await this.preloadRoleData(userId, toRole)

      // 同步角色状态到服务器
      await this.syncRoleStateToServer(userId, toRole)

      // 更新本地存储
      await this.updateLocalStorage(userId, toRole)

      console.log(`用户 ${userId} 角色切换后处理完成: ${fromRole} -> ${toRole}`)
    } catch (error) {
      console.error('后切换处理失败:', error)
    }
  }

  /**
   * 检查用户状态
   */
  private async checkUserStatus(userId: string | number): Promise<{ isActive: boolean }> {
    // 这里可以添加用户状态检查逻辑
    // 例如：检查用户是否被禁用、是否过期等
    return { isActive: true }
  }

  /**
   * 检查角色状态
   */
  private async checkRoleStatus(role: UserRole): Promise<{ isAvailable: boolean }> {
    // 这里可以添加角色状态检查逻辑
    // 例如：检查角色是否被禁用、是否在维护等
    return { isAvailable: true }
  }

  /**
   * 检查业务规则
   */
  private async checkBusinessRules(
    userId: string | number,
    fromRole: UserRole,
    toRole: UserRole
  ): Promise<{ success: boolean; message?: string }> {
    // 这里可以添加业务规则检查
    // 例如：检查切换频率限制、特殊时间段限制等

    // 示例：检查切换频率限制
    const switchHistory = await this.getRoleSwitchHistory(userId, 5)
    const recentSwitches = switchHistory.filter(
      record => Date.now() - record.switchTime < 60 * 1000 // 1分钟内
    )

    if (recentSwitches.length >= 3) {
      return { success: false, message: '角色切换过于频繁，请稍后再试' }
    }

    return { success: true }
  }

  /**
   * 清理角色缓存
   */
  private async clearRoleCache(userId: string | number, role: UserRole): Promise<void> {
    const cacheKeys = [
      `role_permissions_${userId}_${role}`,
      `role_data_${userId}_${role}`,
      `role_config_${userId}_${role}`,
    ]

    cacheKeys.forEach(key => {
      uni.removeStorageSync(key)
    })
  }

  /**
   * 预加载角色数据
   */
  private async preloadRoleData(userId: string | number, role: UserRole): Promise<void> {
    try {
      // 预加载角色权限
      const permissions = await this.roleStateManager.getCurrentUserRole(userId)
      if (permissions) {
        uni.setStorageSync(`role_permissions_${userId}_${role}`, permissions.currentRole.permissions)
      }
    } catch (error) {
      console.error('预加载角色数据失败:', error)
    }
  }

  /**
   * 同步角色状态到服务器
   */
  private async syncRoleStateToServer(userId: string | number, role: UserRole): Promise<void> {
    try {
      // 这里可以添加与服务器同步的逻辑
      console.log(`同步用户 ${userId} 的角色状态 ${role} 到服务器`)
    } catch (error) {
      console.error('同步角色状态到服务器失败:', error)
    }
  }

  /**
   * 更新本地存储
   */
  private async updateLocalStorage(userId: string | number, role: UserRole): Promise<void> {
    const currentData = uni.getStorageSync('currentUserData') || {}
    currentData.currentRole = role
    currentData.lastRoleSwitch = Date.now()
    uni.setStorageSync('currentUserData', currentData)
  }

  /**
   * 取消角色切换
   */
  async cancelRoleSwitch(userId: string | number): Promise<boolean> {
    const userKey = String(userId)

    if (this.switchLocks.has(userKey)) {
      this.emitEvent({
        type: RoleSwitchEventType.SWITCH_CANCELLED,
        userId,
        timestamp: Date.now(),
      })

      this.switchLocks.delete(userKey)
      this.switchQueue.delete(userKey)
      return true
    }

    return false
  }

  // ==================== 委托给 RoleStateManager 的方法 ====================

  async getAvailableRoles(userId: string | number): Promise<Role[]> {
    return this.roleStateManager.getAvailableRoles(userId)
  }

  async addUserRole(userId: string | number, role: Role): Promise<boolean> {
    return this.roleStateManager.addUserRole(userId, role)
  }

  async removeUserRole(userId: string | number, roleType: UserRole): Promise<boolean> {
    return this.roleStateManager.removeUserRole(userId, roleType)
  }

  async getRoleSwitchHistory(userId: string | number, limit?: number): Promise<RoleSwitchRecord[]> {
    return this.roleStateManager.getRoleSwitchHistory(userId, limit)
  }

  validateRoleSwitch(fromRole: UserRole, toRole: UserRole): boolean {
    return this.roleStateManager.validateRoleSwitch(fromRole, toRole)
  }
}
