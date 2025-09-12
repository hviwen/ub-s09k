/**
 * 角色状态管理器 - 基于状态模式实现
 * @description 管理用户角色状态转换和状态机逻辑
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import type { IRoleManager } from '../interfaces'
import type { Role, RoleSwitchOptions, RoleSwitchRecord, UserRoleInfo } from '../types'
import { UserRole } from '../types'

// ==================== 角色状态接口 ====================

/**
 * 角色状态接口
 */
interface IRoleState {
  /** 状态名称 */
  name: string
  /** 进入状态 */
  enter: (context: RoleStateContext) => Promise<void>
  /** 退出状态 */
  exit: (context: RoleStateContext) => Promise<void>
  /** 处理角色切换 */
  handleSwitch: (context: RoleStateContext, targetRole: UserRole) => Promise<boolean>
  /** 检查是否可以切换到目标角色 */
  canSwitchTo: (targetRole: UserRole) => boolean
}

/**
 * 角色状态上下文
 */
interface RoleStateContext {
  userId: string | number
  currentRole: Role
  availableRoles: Role[]
  stateManager: RoleStateManager
}

// ==================== 具体状态实现 ====================

/**
 * 游客状态
 */
class GuestState implements IRoleState {
  name = 'GuestState'

  async enter(context: RoleStateContext): Promise<void> {
    console.log(`用户 ${context.userId} 进入游客状态`)
    // 清除敏感数据
    await this.clearSensitiveData(context)
  }

  async exit(context: RoleStateContext): Promise<void> {
    console.log(`用户 ${context.userId} 退出游客状态`)
  }

  async handleSwitch(context: RoleStateContext, targetRole: UserRole): Promise<boolean> {
    if (targetRole === UserRole.REGULAR) {
      // 游客可以直接切换到普通用户（通过登录）
      return true
    }
    return false
  }

  canSwitchTo(targetRole: UserRole): boolean {
    return targetRole === UserRole.REGULAR
  }

  private async clearSensitiveData(context: RoleStateContext): Promise<void> {
    // 清除可能的敏感缓存数据
    uni.removeStorageSync('userSensitiveData')
  }
}

/**
 * 普通用户状态
 */
class RegularUserState implements IRoleState {
  name = 'RegularUserState'

  async enter(context: RoleStateContext): Promise<void> {
    console.log(`用户 ${context.userId} 进入普通用户状态`)
    // 初始化普通用户数据
    await this.initializeUserData(context)
  }

  async exit(context: RoleStateContext): Promise<void> {
    console.log(`用户 ${context.userId} 退出普通用户状态`)
  }

  async handleSwitch(context: RoleStateContext, targetRole: UserRole): Promise<boolean> {
    const allowedRoles = [UserRole.CHANNEL, UserRole.INSTITUTIONAL]
    return allowedRoles.includes(targetRole)
  }

  canSwitchTo(targetRole: UserRole): boolean {
    const allowedRoles = [UserRole.CHANNEL, UserRole.INSTITUTIONAL, UserRole.GUEST]
    return allowedRoles.includes(targetRole)
  }

  private async initializeUserData(context: RoleStateContext): Promise<void> {
    // 初始化普通用户的基础数据
    const userData = {
      role: UserRole.REGULAR,
      permissions: ['view_content', 'share_content', 'favorite_content'],
      lastLogin: Date.now(),
    }
    uni.setStorageSync('currentUserData', userData)
  }
}

/**
 * 渠道用户状态
 */
class ChannelUserState implements IRoleState {
  name = 'ChannelUserState'

  async enter(context: RoleStateContext): Promise<void> {
    console.log(`用户 ${context.userId} 进入渠道用户状态`)
    await this.initializeChannelData(context)
  }

  async exit(context: RoleStateContext): Promise<void> {
    console.log(`用户 ${context.userId} 退出渠道用户状态`)
  }

  async handleSwitch(context: RoleStateContext, targetRole: UserRole): Promise<boolean> {
    const allowedRoles = [UserRole.REGULAR, UserRole.INSTITUTIONAL]
    return allowedRoles.includes(targetRole)
  }

  canSwitchTo(targetRole: UserRole): boolean {
    const allowedRoles = [UserRole.REGULAR, UserRole.INSTITUTIONAL]
    return allowedRoles.includes(targetRole)
  }

  private async initializeChannelData(context: RoleStateContext): Promise<void> {
    const channelData = {
      role: UserRole.CHANNEL,
      permissions: ['view_content', 'share_content', 'favorite_content', 'download_content', 'create_content'],
      channelInfo: {
        channelId: `channel_${context.userId}`,
        level: 'standard',
      },
    }
    uni.setStorageSync('currentUserData', channelData)
  }
}

/**
 * 机构用户状态
 */
class InstitutionalUserState implements IRoleState {
  name = 'InstitutionalUserState'

  async enter(context: RoleStateContext): Promise<void> {
    console.log(`用户 ${context.userId} 进入机构用户状态`)
    await this.initializeInstitutionalData(context)
  }

  async exit(context: RoleStateContext): Promise<void> {
    console.log(`用户 ${context.userId} 退出机构用户状态`)
  }

  async handleSwitch(context: RoleStateContext, targetRole: UserRole): Promise<boolean> {
    const allowedRoles = [UserRole.REGULAR, UserRole.CHANNEL]
    return allowedRoles.includes(targetRole)
  }

  canSwitchTo(targetRole: UserRole): boolean {
    const allowedRoles = [UserRole.REGULAR, UserRole.CHANNEL]
    return allowedRoles.includes(targetRole)
  }

  private async initializeInstitutionalData(context: RoleStateContext): Promise<void> {
    const institutionalData = {
      role: UserRole.INSTITUTIONAL,
      permissions: ['*'], // 所有权限
      institutionInfo: {
        institutionId: `inst_${context.userId}`,
        type: 'enterprise',
      },
    }
    uni.setStorageSync('currentUserData', institutionalData)
  }
}

/**
 * 管理员状态
 */
class AdminState implements IRoleState {
  name = 'AdminState'

  async enter(context: RoleStateContext): Promise<void> {
    console.log(`用户 ${context.userId} 进入管理员状态`)
    await this.initializeAdminData(context)
  }

  async exit(context: RoleStateContext): Promise<void> {
    console.log(`用户 ${context.userId} 退出管理员状态`)
  }

  async handleSwitch(context: RoleStateContext, targetRole: UserRole): Promise<boolean> {
    // 管理员可以切换到任何角色
    return Object.values(UserRole).includes(targetRole)
  }

  canSwitchTo(targetRole: UserRole): boolean {
    return Object.values(UserRole).includes(targetRole)
  }

  private async initializeAdminData(context: RoleStateContext): Promise<void> {
    const adminData = {
      role: UserRole.ADMIN,
      permissions: ['*'], // 所有权限
      adminInfo: {
        adminLevel: 'super',
        lastAdminAction: Date.now(),
      },
    }
    uni.setStorageSync('currentUserData', adminData)
  }
}

// ==================== 角色状态管理器 ====================

/**
 * 角色状态管理器
 */
export class RoleStateManager implements IRoleManager {
  private states: Map<UserRole, IRoleState>
  private currentStates: Map<string | number, IRoleState>
  private userRoleInfo: Map<string | number, UserRoleInfo>
  private switchHistory: Map<string | number, RoleSwitchRecord[]>

  constructor() {
    this.states = new Map()
    this.currentStates = new Map()
    this.userRoleInfo = new Map()
    this.switchHistory = new Map()

    this.initializeStates()
  }

  /**
   * 初始化所有状态
   */
  private initializeStates(): void {
    this.states.set(UserRole.GUEST, new GuestState())
    this.states.set(UserRole.REGULAR, new RegularUserState())
    this.states.set(UserRole.CHANNEL, new ChannelUserState())
    this.states.set(UserRole.INSTITUTIONAL, new InstitutionalUserState())
    this.states.set(UserRole.ADMIN, new AdminState())
  }

  /**
   * 获取用户当前角色信息
   */
  async getCurrentUserRole(userId: string | number): Promise<UserRoleInfo | null> {
    return this.userRoleInfo.get(userId) || null
  }

  /**
   * 切换用户角色
   */
  async switchRole(userId: string | number, options: RoleSwitchOptions): Promise<boolean> {
    try {
      const currentRoleInfo = this.userRoleInfo.get(userId)
      if (!currentRoleInfo) {
        throw new Error('用户角色信息不存在')
      }

      const currentState = this.currentStates.get(userId)
      const targetState = this.states.get(options.targetRole)

      if (!currentState || !targetState) {
        throw new Error('状态不存在')
      }

      // 检查是否可以切换
      if (!this.validateRoleSwitch(currentRoleInfo.currentRole.type, options.targetRole)) {
        throw new Error('不允许的角色切换')
      }

      // 创建状态上下文
      const context: RoleStateContext = {
        userId,
        currentRole: currentRoleInfo.currentRole,
        availableRoles: currentRoleInfo.availableRoles,
        stateManager: this,
      }

      // 执行状态切换
      const canSwitch = await currentState.handleSwitch(context, options.targetRole)
      if (!canSwitch) {
        throw new Error('当前状态不允许切换到目标角色')
      }

      // 退出当前状态
      await currentState.exit(context)

      // 更新角色信息
      const targetRole = currentRoleInfo.availableRoles.find(role => role.type === options.targetRole)
      if (!targetRole) {
        throw new Error('目标角色不在可用角色列表中')
      }

      currentRoleInfo.currentRole = targetRole
      context.currentRole = targetRole

      // 进入新状态
      await targetState.enter(context)

      // 更新当前状态
      this.currentStates.set(userId, targetState)

      // 记录切换历史
      if (options.saveHistory !== false) {
        this.recordRoleSwitch(userId, {
          id: `switch_${Date.now()}`,
          fromRole: currentRoleInfo.currentRole.type,
          toRole: options.targetRole,
          switchTime: Date.now(),
          reason: options.reason,
          success: true,
        })
      }

      // 执行成功回调
      if (options.onSuccess) {
        options.onSuccess(targetRole)
      }

      return true
    } catch (error) {
      console.error('角色切换失败:', error)

      // 执行失败回调
      if (options.onError) {
        options.onError(error as Error)
      }

      return false
    }
  }

  /**
   * 获取用户可用角色列表
   */
  async getAvailableRoles(userId: string | number): Promise<Role[]> {
    const roleInfo = this.userRoleInfo.get(userId)
    return roleInfo?.availableRoles || []
  }

  /**
   * 添加用户角色
   */
  async addUserRole(userId: string | number, role: Role): Promise<boolean> {
    try {
      let roleInfo = this.userRoleInfo.get(userId)

      if (!roleInfo) {
        // 创建新的用户角色信息
        roleInfo = {
          userId,
          currentRole: role,
          availableRoles: [role],
          lastUpdated: Date.now(),
        }
        this.userRoleInfo.set(userId, roleInfo)

        // 设置初始状态
        const state = this.states.get(role.type)
        if (state) {
          this.currentStates.set(userId, state)
          await state.enter({
            userId,
            currentRole: role,
            availableRoles: [role],
            stateManager: this,
          })
        }
      } else {
        // 添加到可用角色列表
        const existingRole = roleInfo.availableRoles.find(r => r.type === role.type)
        if (!existingRole) {
          roleInfo.availableRoles.push(role)
          roleInfo.lastUpdated = Date.now()
        }
      }

      return true
    } catch (error) {
      console.error('添加用户角色失败:', error)
      return false
    }
  }

  /**
   * 移除用户角色
   */
  async removeUserRole(userId: string | number, roleType: UserRole): Promise<boolean> {
    try {
      const roleInfo = this.userRoleInfo.get(userId)
      if (!roleInfo) {
        return false
      }

      // 不能移除当前激活的角色
      if (roleInfo.currentRole.type === roleType) {
        throw new Error('不能移除当前激活的角色')
      }

      // 从可用角色列表中移除
      roleInfo.availableRoles = roleInfo.availableRoles.filter(role => role.type !== roleType)
      roleInfo.lastUpdated = Date.now()

      return true
    } catch (error) {
      console.error('移除用户角色失败:', error)
      return false
    }
  }

  /**
   * 获取角色切换历史
   */
  async getRoleSwitchHistory(userId: string | number, limit = 10): Promise<RoleSwitchRecord[]> {
    const history = this.switchHistory.get(userId) || []
    return history.slice(-limit).reverse() // 返回最近的记录
  }

  /**
   * 验证角色切换是否合法
   */
  validateRoleSwitch(fromRole: UserRole, toRole: UserRole): boolean {
    const state = this.states.get(fromRole)
    return state ? state.canSwitchTo(toRole) : false
  }

  /**
   * 记录角色切换历史
   */
  private recordRoleSwitch(userId: string | number, record: RoleSwitchRecord): void {
    let history = this.switchHistory.get(userId) || []
    history.push(record)

    // 限制历史记录数量
    if (history.length > 50) {
      history = history.slice(-50)
    }

    this.switchHistory.set(userId, history)
  }

  /**
   * 清除用户状态
   */
  async clearUserState(userId: string | number): Promise<void> {
    const currentState = this.currentStates.get(userId)
    const roleInfo = this.userRoleInfo.get(userId)

    if (currentState && roleInfo) {
      await currentState.exit({
        userId,
        currentRole: roleInfo.currentRole,
        availableRoles: roleInfo.availableRoles,
        stateManager: this,
      })
    }

    this.currentStates.delete(userId)
    this.userRoleInfo.delete(userId)
    this.switchHistory.delete(userId)
  }
}
