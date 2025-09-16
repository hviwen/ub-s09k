/**
 * 权限系统启动优化器
 * @description 实现渐进式启动、性能监控和缓存预热
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import type { UserRoleInfo, UserRole, Permission } from '../types'
import { getPermissionApiService } from '../api/PermissionApiService'
import { getPermissionCacheManager } from '../cache/PermissionCacheManager'

// ==================== 启动阶段定义 ====================

/**
 * 启动阶段枚举
 */
export enum StartupPhase {
  /** 快速启动 - 加载必需数据 */
  QUICK_START = 'quick_start',
  /** 后台加载 - 异步加载非必需数据 */
  BACKGROUND_LOAD = 'background_load',
  /** 缓存预热 - 预加载常用权限 */
  CACHE_PRELOAD = 'cache_preload',
  /** 完全就绪 - 所有数据加载完成 */
  FULLY_READY = 'fully_ready',
}

/**
 * 启动性能指标
 */
export interface StartupMetrics {
  /** 总启动时间 */
  totalStartupTime: number
  /** 各阶段耗时 */
  phaseTimings: Record<StartupPhase, number>
  /** 缓存命中率 */
  cacheHitRate: number
  /** 网络请求次数 */
  networkRequests: number
  /** 错误次数 */
  errorCount: number
}

/**
 * 启动配置
 */
export interface StartupConfig {
  /** 是否启用快速启动 */
  enableQuickStart: boolean
  /** 是否启用后台加载 */
  enableBackgroundLoad: boolean
  /** 是否启用缓存预热 */
  enableCachePreload: boolean
  /** 快速启动超时时间（毫秒） */
  quickStartTimeout: number
  /** 预加载的权限数量 */
  preloadPermissionCount: number
  /** 是否启用性能监控 */
  enablePerformanceMonitoring: boolean
}

// ==================== 启动优化器实现 ====================

/**
 * 权限系统启动优化器
 */
export class StartupOptimizer {
  private config: StartupConfig
  private metrics: StartupMetrics
  private startTime: number = 0
  private phaseStartTimes: Record<string, number> = {}
  private apiService = getPermissionApiService()
  private cacheManager = getPermissionCacheManager()

  constructor(config: Partial<StartupConfig> = {}) {
    this.config = {
      enableQuickStart: true,
      enableBackgroundLoad: true,
      enableCachePreload: true,
      quickStartTimeout: 2000, // 2秒
      preloadPermissionCount: 10,
      enablePerformanceMonitoring: true,
      ...config,
    }

    this.metrics = {
      totalStartupTime: 0,
      phaseTimings: {} as Record<StartupPhase, number>,
      cacheHitRate: 0,
      networkRequests: 0,
      errorCount: 0,
    }
  }

  /**
   * 优化的权限系统初始化
   * @param userId 用户ID
   * @returns 用户角色信息
   */
  async initializePermissionSystem(userId: string | number): Promise<UserRoleInfo | null> {
    this.startTime = Date.now()
    this.logPhaseStart(StartupPhase.QUICK_START)

    try {
      // 阶段1：快速启动 - 只加载必需数据
      const userRoleInfo = await this.quickStart(userId)
      this.logPhaseEnd(StartupPhase.QUICK_START)

      if (!userRoleInfo) {
        throw new Error('快速启动失败：无法获取用户角色信息')
      }

      // 阶段2：后台加载 - 异步加载非必需数据
      if (this.config.enableBackgroundLoad) {
        this.backgroundLoad(userId, userRoleInfo).catch(error => {
          console.warn('后台加载失败:', error)
          this.metrics.errorCount++
        })
      }

      // 阶段3：缓存预热 - 预加载常用权限
      if (this.config.enableCachePreload) {
        this.preloadCommonPermissions(userId, userRoleInfo).catch(error => {
          console.warn('缓存预热失败:', error)
          this.metrics.errorCount++
        })
      }

      return userRoleInfo
    } catch (error) {
      console.error('权限系统初始化失败:', error)
      this.metrics.errorCount++
      throw error
    } finally {
      this.calculateTotalStartupTime()
      if (this.config.enablePerformanceMonitoring) {
        this.reportPerformanceMetrics()
      }
    }
  }

  /**
   * 阶段1：快速启动（优化版本）
   * @param userId 用户ID
   * @returns 基础用户角色信息
   */
  private async quickStart(userId: string | number): Promise<UserRoleInfo | null> {
    try {
      // 优化1：并行检查多个缓存源
      const cachePromises = [
        this.cacheManager.getUserRoleFromCache(userId),
        this.getLocalStorageUserRole(userId),
        this.getSessionStorageUserRole(userId),
      ]

      const cachedResults = await Promise.allSettled(cachePromises)

      // 寻找最新的有效缓存
      for (const result of cachedResults) {
        if (result.status === 'fulfilled' && result.value && this.isUserRoleValid(result.value)) {
          console.log('从缓存快速加载用户角色信息')
          // 异步更新其他缓存源
          this.syncCacheInBackground(userId, result.value)
          return result.value
        }
      }

      // 优化2：网络请求超时时间动态调整
      const dynamicTimeout = this.calculateDynamicTimeout()

      // 缓存未命中，从API获取基础信息
      this.metrics.networkRequests++
      const userRoleInfo = await Promise.race([
        this.apiService.fetchUserRoles(userId),
        this.createTimeoutPromise(dynamicTimeout),
      ])

      if (userRoleInfo) {
        // 优化3：并行缓存到多个存储
        this.cacheUserRoleParallel(userId, userRoleInfo)
        console.log('快速启动完成，用户角色信息已加载')
        return userRoleInfo
      }

      return null
    } catch (error) {
      console.error('快速启动失败:', error)
      // 降级策略：创建默认游客角色
      return this.createDefaultGuestRole(userId)
    }
  }

  /**
   * 从本地存储获取用户角色
   */
  private async getLocalStorageUserRole(userId: string | number): Promise<UserRoleInfo | null> {
    try {
      const key = `user_role_${userId}`
      const data = uni.getStorageSync(key)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  /**
   * 从会话存储获取用户角色
   */
  private async getSessionStorageUserRole(userId: string | number): Promise<UserRoleInfo | null> {
    try {
      const key = `session_user_role_${userId}`
      const data = uni.getStorageSync(key)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  /**
   * 计算动态超时时间
   */
  private calculateDynamicTimeout(): number {
    // 基于网络状况动态调整超时时间
    const networkType = uni.getNetworkType?.()?.networkType || 'unknown'
    const baseTimeout = this.config.quickStartTimeout

    switch (networkType) {
      case 'wifi':
        return baseTimeout * 0.8 // WiFi环境缩短超时
      case '4g':
        return baseTimeout
      case '3g':
        return baseTimeout * 1.5
      case '2g':
        return baseTimeout * 2
      default:
        return baseTimeout
    }
  }

  /**
   * 并行缓存用户角色信息
   */
  private async cacheUserRoleParallel(userId: string | number, userRoleInfo: UserRoleInfo): Promise<void> {
    const cachePromises = [
      this.cacheManager.cacheUserRole(userId, userRoleInfo),
      this.setLocalStorageUserRole(userId, userRoleInfo),
      this.setSessionStorageUserRole(userId, userRoleInfo),
    ]

    // 不等待缓存完成，提升响应速度
    Promise.allSettled(cachePromises).catch(error => {
      console.warn('并行缓存失败:', error)
    })
  }

  /**
   * 设置本地存储用户角色
   */
  private async setLocalStorageUserRole(userId: string | number, userRoleInfo: UserRoleInfo): Promise<void> {
    try {
      const key = `user_role_${userId}`
      uni.setStorageSync(key, JSON.stringify(userRoleInfo))
    } catch (error) {
      console.warn('设置本地存储失败:', error)
    }
  }

  /**
   * 设置会话存储用户角色
   */
  private async setSessionStorageUserRole(userId: string | number, userRoleInfo: UserRoleInfo): Promise<void> {
    try {
      const key = `session_user_role_${userId}`
      uni.setStorageSync(key, JSON.stringify(userRoleInfo))
    } catch (error) {
      console.warn('设置会话存储失败:', error)
    }
  }

  /**
   * 后台同步缓存
   */
  private async syncCacheInBackground(userId: string | number, userRoleInfo: UserRoleInfo): Promise<void> {
    // 异步同步其他缓存源
    setTimeout(() => {
      this.cacheUserRoleParallel(userId, userRoleInfo)
    }, 100)
  }

  /**
   * 阶段2：后台加载
   * @param userId 用户ID
   * @param userRoleInfo 用户角色信息
   */
  private async backgroundLoad(userId: string | number, userRoleInfo: UserRoleInfo): Promise<void> {
    this.logPhaseStart(StartupPhase.BACKGROUND_LOAD)

    try {
      // 异步加载角色切换历史
      const historyPromise = this.apiService
        .fetchRoleSwitchHistory(userId, 20)
        .then(history => {
          console.log('角色切换历史加载完成')
          return history
        })
        .catch(error => {
          console.warn('加载角色切换历史失败:', error)
          return []
        })

      // 异步加载权限配置
      const configPromise = this.apiService
        .fetchPermissionConfig()
        .then(config => {
          console.log('权限配置加载完成')
          return config
        })
        .catch(error => {
          console.warn('加载权限配置失败:', error)
          return {}
        })

      // 异步同步用户状态
      const syncPromise = this.apiService
        .syncUserRoleState(userId, userRoleInfo)
        .then(success => {
          if (success) {
            console.log('用户状态同步完成')
          }
          return success
        })
        .catch(error => {
          console.warn('同步用户状态失败:', error)
          return false
        })

      // 等待所有后台任务完成
      await Promise.allSettled([historyPromise, configPromise, syncPromise])

      this.logPhaseEnd(StartupPhase.BACKGROUND_LOAD)
    } catch (error) {
      console.error('后台加载失败:', error)
      this.metrics.errorCount++
    }
  }

  /**
   * 阶段3：缓存预热
   * @param userId 用户ID
   * @param userRoleInfo 用户角色信息
   */
  private async preloadCommonPermissions(userId: string | number, userRoleInfo: UserRoleInfo): Promise<void> {
    this.logPhaseStart(StartupPhase.CACHE_PRELOAD)

    try {
      const currentRole = userRoleInfo.currentRole.type

      // 预加载常用页面权限
      const commonPages = this.getCommonPagesForRole(currentRole)
      const preloadPromises = commonPages.map(async pageId => {
        try {
          const context = {
            userRole: userRoleInfo,
            resource: { type: 'page' as any, id: pageId },
            action: 'view' as any,
          }

          const result = await this.apiService.validatePermission(context)

          // 缓存权限检查结果
          const cacheKey = `permission_${userId}_${currentRole}_view_page_${pageId}`
          await this.cacheManager.set(cacheKey, result, 5 * 60 * 1000) // 5分钟缓存

          return result
        } catch (error) {
          console.warn(`预加载页面权限失败: ${pageId}`, error)
          return null
        }
      })

      await Promise.allSettled(preloadPromises)

      this.logPhaseEnd(StartupPhase.CACHE_PRELOAD)
      console.log('缓存预热完成')
    } catch (error) {
      console.error('缓存预热失败:', error)
      this.metrics.errorCount++
    }
  }

  /**
   * 获取角色的常用页面列表
   * @param role 用户角色
   * @returns 常用页面ID列表
   */
  private getCommonPagesForRole(role: UserRole): string[] {
    const commonPagesMap: Record<UserRole, string[]> = {
      [UserRole.GUEST]: ['home', 'about', 'help'],
      [UserRole.REGULAR]: ['home', 'profile', 'investment', 'portfolio'],
      [UserRole.CHANNEL]: ['home', 'profile', 'channel_dashboard', 'commission', 'customer_list'],
      [UserRole.INSTITUTIONAL]: ['home', 'profile', 'institutional_dashboard', 'risk_control', 'bulk_operations'],
      [UserRole.ADMIN]: ['home', 'admin_dashboard', 'user_management', 'system_config', 'audit_logs'],
    }

    return commonPagesMap[role] || commonPagesMap[UserRole.GUEST]
  }

  /**
   * 创建超时Promise
   * @param timeout 超时时间（毫秒）
   * @returns 超时Promise
   */
  private createTimeoutPromise<T>(timeout: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`操作超时: ${timeout}ms`))
      }, timeout)
    })
  }

  /**
   * 检查用户角色信息是否有效
   * @param userRoleInfo 用户角色信息
   * @returns 是否有效
   */
  private isUserRoleValid(userRoleInfo: UserRoleInfo): boolean {
    if (!userRoleInfo || !userRoleInfo.currentRole) {
      return false
    }

    // 检查是否过期（缓存时间超过30分钟）
    const cacheAge = Date.now() - (userRoleInfo.lastUpdated || 0)
    if (cacheAge > 30 * 60 * 1000) {
      return false
    }

    return true
  }

  /**
   * 创建默认游客角色
   * @param userId 用户ID
   * @returns 默认游客角色信息
   */
  private createDefaultGuestRole(userId: string | number): UserRoleInfo {
    return {
      userId,
      currentRole: {
        id: 'guest',
        type: UserRole.GUEST,
        name: '游客',
        description: '未登录用户',
        permissions: [],
        status: 'active' as any,
      },
      availableRoles: [],
      lastUpdated: Date.now(),
    }
  }

  /**
   * 记录阶段开始时间
   * @param phase 启动阶段
   */
  private logPhaseStart(phase: StartupPhase): void {
    this.phaseStartTimes[phase] = Date.now()
  }

  /**
   * 记录阶段结束时间
   * @param phase 启动阶段
   */
  private logPhaseEnd(phase: StartupPhase): void {
    const startTime = this.phaseStartTimes[phase]
    if (startTime) {
      this.metrics.phaseTimings[phase] = Date.now() - startTime
    }
  }

  /**
   * 计算总启动时间
   */
  private calculateTotalStartupTime(): void {
    this.metrics.totalStartupTime = Date.now() - this.startTime
  }

  /**
   * 报告性能指标
   */
  private reportPerformanceMetrics(): void {
    console.group('权限系统启动性能报告')
    console.log('总启动时间:', this.metrics.totalStartupTime, 'ms')
    console.log('各阶段耗时:', this.metrics.phaseTimings)
    console.log('网络请求次数:', this.metrics.networkRequests)
    console.log('错误次数:', this.metrics.errorCount)

    // 性能建议
    if (this.metrics.totalStartupTime > 3000) {
      console.warn('启动时间过长，建议优化网络请求或增加缓存')
    }

    if (this.metrics.errorCount > 0) {
      console.warn('启动过程中出现错误，建议检查网络连接和API状态')
    }

    console.groupEnd()
  }

  /**
   * 获取性能指标
   * @returns 性能指标
   */
  getMetrics(): StartupMetrics {
    return { ...this.metrics }
  }

  /**
   * 重置性能指标
   */
  resetMetrics(): void {
    this.metrics = {
      totalStartupTime: 0,
      phaseTimings: {} as Record<StartupPhase, number>,
      cacheHitRate: 0,
      networkRequests: 0,
      errorCount: 0,
    }
    this.phaseStartTimes = {}
  }
}

// ==================== 单例实例 ====================

let startupOptimizerInstance: StartupOptimizer | null = null

/**
 * 获取启动优化器单例
 * @param config 启动配置
 * @returns 启动优化器实例
 */
export function getStartupOptimizer(config?: Partial<StartupConfig>): StartupOptimizer {
  if (!startupOptimizerInstance) {
    startupOptimizerInstance = new StartupOptimizer(config)
  }
  return startupOptimizerInstance
}

/**
 * 重置启动优化器单例
 */
export function resetStartupOptimizer(): void {
  startupOptimizerInstance = null
}
