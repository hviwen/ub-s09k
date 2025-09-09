/**
 * 权限状态管理Store - 基于Pinia实现
 * @description 管理用户角色、权限状态，支持多角色切换和状态同步
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import type { IRoleSwitchListener, RoleSwitchEvent } from '../core/RoleSwitchService'
import {
  AccessControlAction,
  Permission,
  PermissionCheckResult,
  PermissionContext,
  Role,
  RoleSwitchOptions,
  RoleSwitchRecord,
  UserRole,
  UserRoleInfo,
} from '../types'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { ContentAccessController } from '../core/ContentAccessController'
import { PermissionController } from '../core/PermissionController'
import { RoleSwitchService } from '../core/RoleSwitchService'

// ==================== 状态接口定义 ====================

/**
 * 权限状态接口
 */
interface PermissionState {
  /** 当前用户ID */
  currentUserId: string | number | null
  /** 用户角色信息 */
  userRoleInfo: UserRoleInfo | null
  /** 权限检查缓存 */
  permissionCache: Map<string, PermissionCheckResult>
  /** 角色切换历史 */
  switchHistory: RoleSwitchRecord[]
  /** 是否正在切换角色 */
  isSwitchingRole: boolean
  /** 权限系统是否已初始化 */
  isInitialized: boolean
  /** 最后更新时间 */
  lastUpdated: number
}

// ==================== 权限Store实现 ====================

export const usePermissionStore = defineStore(
  'permission',
  () => {
    // ==================== 状态定义 ====================

    const currentUserId = ref<string | number | null>(null)
    const userRoleInfo = ref<UserRoleInfo | null>(null)
    const permissionCache = ref(new Map<string, PermissionCheckResult>())
    const switchHistory = ref<RoleSwitchRecord[]>([])
    const isSwitchingRole = ref(false)
    const isInitialized = ref(false)
    const lastUpdated = ref(0)

    // ==================== 服务实例 ====================

    const roleSwitchService = new RoleSwitchService()
    const permissionController = new PermissionController({ debugMode: import.meta.env.DEV })
    const contentAccessController = new ContentAccessController({ debugMode: import.meta.env.DEV })

    // ==================== 计算属性 ====================

    /**
     * 当前角色
     */
    const currentRole = computed<UserRole | null>(() => {
      return userRoleInfo.value?.currentRole?.type || null
    })

    /**
     * 当前角色信息
     */
    const currentRoleInfo = computed<Role | null>(() => {
      return userRoleInfo.value?.currentRole || null
    })

    /**
     * 可用角色列表
     */
    const availableRoles = computed<Role[]>(() => {
      return userRoleInfo.value?.availableRoles || []
    })

    /**
     * 当前角色权限列表
     */
    const currentPermissions = computed<Permission[]>(() => {
      return userRoleInfo.value?.currentRole?.permissions || []
    })

    /**
     * 是否已登录
     */
    const isLoggedIn = computed(() => {
      return currentUserId.value !== null && currentRole.value !== UserRole.GUEST
    })

    /**
     * 是否为管理员
     */
    const isAdmin = computed(() => {
      return currentRole.value === UserRole.ADMIN
    })

    /**
     * 是否可以切换角色
     */
    const canSwitchRole = computed(() => {
      return availableRoles.value.length > 1 && !isSwitchingRole.value
    })

    // ==================== 角色切换监听器 ====================

    class PermissionStoreListener implements IRoleSwitchListener {
      onRoleSwitchEvent(event: RoleSwitchEvent): void {
        switch (event.type) {
          case 'switch_start':
            isSwitchingRole.value = true
            break
          case 'switch_success':
            isSwitchingRole.value = false
            // 清除权限缓存
            clearPermissionCache()
            // 更新最后更新时间
            lastUpdated.value = Date.now()
            break
          case 'switch_failed':
          case 'switch_cancelled':
            isSwitchingRole.value = false
            break
          case 'permissions_updated':
            // 权限更新时清除缓存
            clearPermissionCache()
            break
        }
      }
    }

    // 注册监听器
    roleSwitchService.addListener(new PermissionStoreListener())

    // ==================== 初始化方法 ====================

    /**
     * 初始化权限系统
     */
    const initializePermissionSystem = async (userId: string | number): Promise<void> => {
      try {
        console.log(`初始化权限系统，用户ID: ${userId}`)

        currentUserId.value = userId

        // 获取用户角色信息
        const roleInfo = await roleSwitchService.getCurrentUserRole(userId)
        if (roleInfo) {
          userRoleInfo.value = roleInfo
        }
        else {
          // 如果没有角色信息，创建默认游客角色
          await createDefaultGuestRole(userId)
        }

        // 获取角色切换历史
        switchHistory.value = await roleSwitchService.getRoleSwitchHistory(userId, 20)

        isInitialized.value = true
        lastUpdated.value = Date.now()

        console.log('权限系统初始化完成', { userId, roleInfo: userRoleInfo.value })
      }
      catch (error) {
        console.error('权限系统初始化失败:', error)
        throw error
      }
    }

    /**
     * 创建默认游客角色
     */
    const createDefaultGuestRole = async (userId: string | number): Promise<void> => {
      const guestRole: Role = {
        id: 'guest',
        type: UserRole.GUEST,
        name: '游客',
        description: '未登录用户',
        permissions: [],
        status: 'active' as any,
      }

      await roleSwitchService.addUserRole(userId, guestRole)

      userRoleInfo.value = {
        userId,
        currentRole: guestRole,
        availableRoles: [guestRole],
        lastUpdated: Date.now(),
      }
    }

    // ==================== 角色管理方法 ====================

    /**
     * 切换角色
     */
    const switchRole = async (targetRole: UserRole, reason?: string): Promise<boolean> => {
      if (!currentUserId.value) {
        throw new Error('用户未登录')
      }

      const options: RoleSwitchOptions = {
        targetRole,
        reason,
        saveHistory: true,
        onSuccess: (newRole: Role) => {
          if (userRoleInfo.value) {
            userRoleInfo.value.currentRole = newRole
            userRoleInfo.value.lastUpdated = Date.now()
          }

          // 触发成功提示
          uni.showToast({
            title: `已切换到${newRole.name}`,
            icon: 'success',
          })
        },
        onError: (error: Error) => {
          uni.showToast({
            title: `角色切换失败: ${error.message}`,
            icon: 'error',
          })
        },
      }

      return roleSwitchService.switchRole(currentUserId.value, options)
    }

    /**
     * 添加用户角色
     */
    const addUserRole = async (role: Role): Promise<boolean> => {
      if (!currentUserId.value) {
        throw new Error('用户未登录')
      }

      const success = await roleSwitchService.addUserRole(currentUserId.value, role)

      if (success && userRoleInfo.value) {
        // 更新可用角色列表
        const existingRole = userRoleInfo.value.availableRoles.find(r => r.type === role.type)
        if (!existingRole) {
          userRoleInfo.value.availableRoles.push(role)
          userRoleInfo.value.lastUpdated = Date.now()
        }
      }

      return success
    }

    /**
     * 移除用户角色
     */
    const removeUserRole = async (roleType: UserRole): Promise<boolean> => {
      if (!currentUserId.value) {
        throw new Error('用户未登录')
      }

      const success = await roleSwitchService.removeUserRole(currentUserId.value, roleType)

      if (success && userRoleInfo.value) {
        // 更新可用角色列表
        userRoleInfo.value.availableRoles = userRoleInfo.value.availableRoles.filter(
          role => role.type !== roleType,
        )
        userRoleInfo.value.lastUpdated = Date.now()
      }

      return success
    }

    // ==================== 权限检查方法 ====================

    /**
     * 检查权限
     */
    const checkPermission = async (context: PermissionContext): Promise<PermissionCheckResult> => {
      // 生成缓存键
      const cacheKey = generatePermissionCacheKey(context)

      // 检查缓存
      const cachedResult = permissionCache.value.get(cacheKey)
      if (cachedResult) {
        return cachedResult
      }

      // 执行权限检查
      const result = await permissionController.checkPermission(context)

      // 缓存结果
      permissionCache.value.set(cacheKey, result)

      return result
    }

    /**
     * 检查是否有指定权限
     */
    const hasPermission = async (
      action: string,
      resourceType: string,
      resourceId: string,
    ): Promise<boolean> => {
      if (!userRoleInfo.value) {
        return false
      }

      const context: PermissionContext = {
        userRole: userRoleInfo.value,
        resource: { type: resourceType as any, id: resourceId },
        action: action as any,
      }

      const result = await checkPermission(context)
      return result.hasPermission
    }

    /**
     * 检查内容访问权限
     */
    const checkContentAccess = async (
      contentId: string,
      context?: any,
    ): Promise<AccessControlAction> => {
      if (!currentRole.value) {
        return AccessControlAction.LOGIN_GUIDANCE
      }

      return contentAccessController.checkContentAccess(contentId, currentRole.value, context)
    }

    /**
     * 批量检查内容访问权限
     */
    const batchCheckContentAccess = async (
      contentIds: string[],
    ): Promise<Record<string, AccessControlAction>> => {
      if (!currentRole.value) {
        const result: Record<string, AccessControlAction> = {}
        contentIds.forEach((id) => {
          result[id] = AccessControlAction.LOGIN_GUIDANCE
        })
        return result
      }

      return contentAccessController.batchCheckContentAccess(contentIds, currentRole.value)
    }

    // ==================== 缓存管理方法 ====================

    /**
     * 清除权限缓存
     */
    const clearPermissionCache = (): void => {
      permissionCache.value.clear()
      permissionController.clearCache()
    }

    /**
     * 清除指定模式的权限缓存
     */
    const clearPermissionCacheByPattern = (pattern: string): void => {
      const regex = new RegExp(pattern)

      for (const key of permissionCache.value.keys()) {
        if (regex.test(key)) {
          permissionCache.value.delete(key)
        }
      }

      permissionController.clearCacheByPattern(pattern)
    }

    /**
     * 生成权限缓存键
     */
    const generatePermissionCacheKey = (context: PermissionContext): string => {
      const roleType = context.userRole?.currentRole?.type || 'unknown'
      const resourceInfo = context.resource ? `${context.resource.type}:${context.resource.id}` : 'no-resource'
      const actionInfo = context.action || 'no-action'

      return `${roleType}:${resourceInfo}:${actionInfo}`
    }

    // ==================== 数据同步方法 ====================

    /**
     * 同步用户角色信息
     */
    const syncUserRoleInfo = async (): Promise<void> => {
      if (!currentUserId.value) {
        return
      }

      try {
        const roleInfo = await roleSwitchService.getCurrentUserRole(currentUserId.value)
        if (roleInfo) {
          userRoleInfo.value = roleInfo
          lastUpdated.value = Date.now()

          // 清除缓存以确保使用最新权限
          clearPermissionCache()
        }
      }
      catch (error) {
        console.error('同步用户角色信息失败:', error)
      }
    }

    /**
     * 重置权限状态
     */
    const resetPermissionState = (): void => {
      currentUserId.value = null
      userRoleInfo.value = null
      permissionCache.value.clear()
      switchHistory.value = []
      isSwitchingRole.value = false
      isInitialized.value = false
      lastUpdated.value = 0

      // 清除服务层缓存
      permissionController.clearCache()
    }

    // ==================== 监听器设置 ====================

    // 监听角色变化，自动清除相关缓存
    watch(
      () => currentRole.value,
      (newRole, oldRole) => {
        if (newRole !== oldRole) {
          console.log(`角色变化: ${oldRole} -> ${newRole}`)
          clearPermissionCache()
        }
      },
    )

    // ==================== 返回Store接口 ====================

    return {
      // 状态
      currentUserId: readonly(currentUserId),
      userRoleInfo: readonly(userRoleInfo),
      switchHistory: readonly(switchHistory),
      isSwitchingRole: readonly(isSwitchingRole),
      isInitialized: readonly(isInitialized),
      lastUpdated: readonly(lastUpdated),

      // 计算属性
      currentRole,
      currentRoleInfo,
      availableRoles,
      currentPermissions,
      isLoggedIn,
      isAdmin,
      canSwitchRole,

      // 初始化方法
      initializePermissionSystem,

      // 角色管理方法
      switchRole,
      addUserRole,
      removeUserRole,

      // 权限检查方法
      checkPermission,
      hasPermission,
      checkContentAccess,
      batchCheckContentAccess,

      // 缓存管理方法
      clearPermissionCache,
      clearPermissionCacheByPattern,

      // 数据同步方法
      syncUserRoleInfo,
      resetPermissionState,

      // 服务实例（供高级用法）
      roleSwitchService,
      permissionController,
      contentAccessController,
    }
  },
  {
    persist: {
      key: 'permission-store',
      storage: {
        getItem: (key: string) => uni.getStorageSync(key),
        setItem: (key: string, value: string) => uni.setStorageSync(key, value),
        removeItem: (key: string) => uni.removeStorageSync(key),
      },
      paths: [
        'currentUserId',
        'userRoleInfo',
        'switchHistory',
        'lastUpdated',
      ],
    },
  },
)
