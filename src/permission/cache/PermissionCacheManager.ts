/**
 * 权限缓存管理器 - 多级缓存策略
 * @description 实现内存缓存、持久化缓存和预加载策略
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import type { ICacheService } from '../interfaces'
import type { Permission, PermissionCheckResult, Role, UserRole } from '../types'

// ==================== 缓存配置类型 ====================

/**
 * 缓存配置
 */
interface CacheConfig {
  /** 内存缓存最大条目数 */
  maxMemoryEntries: number
  /** 内存缓存TTL（毫秒） */
  memoryTtl: number
  /** 持久化缓存TTL（毫秒） */
  persistentTtl: number
  /** 是否启用预加载 */
  enablePreload: boolean
  /** 预加载延迟（毫秒） */
  preloadDelay: number
  /** 缓存键前缀 */
  keyPrefix: string
}

/**
 * 缓存条目
 */
interface CacheEntry<T = any> {
  /** 缓存值 */
  value: T
  /** 创建时间 */
  createdAt: number
  /** 过期时间 */
  expiresAt: number
  /** 访问次数 */
  accessCount: number
  /** 最后访问时间 */
  lastAccessAt: number
}

/**
 * 缓存统计信息
 */
interface CacheStats {
  /** 内存缓存命中次数 */
  memoryHits: number
  /** 持久化缓存命中次数 */
  persistentHits: number
  /** 缓存未命中次数 */
  misses: number
  /** 总请求次数 */
  totalRequests: number
  /** 命中率 */
  hitRate: number
  /** 内存使用条目数 */
  memoryEntries: number
  /** 持久化缓存条目数 */
  persistentEntries: number
}

// ==================== 权限缓存管理器实现 ====================

/**
 * 权限缓存管理器
 */
export class PermissionCacheManager implements ICacheService {
  private config: CacheConfig
  private memoryCache: Map<string, CacheEntry>
  private stats: CacheStats
  private cleanupTimer: number | null = null
  private preloadQueue: Set<string> = new Set()

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxMemoryEntries: 1000,
      memoryTtl: 5 * 60 * 1000, // 5分钟
      persistentTtl: 30 * 60 * 1000, // 30分钟
      enablePreload: true,
      preloadDelay: 100,
      keyPrefix: 'permission_cache_',
      ...config,
    }

    this.memoryCache = new Map()
    this.stats = {
      memoryHits: 0,
      persistentHits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      memoryEntries: 0,
      persistentEntries: 0,
    }

    this.startCleanupTimer()
  }

  // ==================== 缓存操作方法 ====================

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    this.stats.totalRequests++
    const fullKey = this.getFullKey(key)

    // 1. 尝试从内存缓存获取
    const memoryEntry = this.memoryCache.get(fullKey)
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      this.updateAccessInfo(memoryEntry)
      this.stats.memoryHits++
      this.updateHitRate()
      return memoryEntry.value as T
    }

    // 2. 尝试从持久化缓存获取
    try {
      const persistentValue = await this.getPersistentCache<T>(fullKey)
      if (persistentValue !== null) {
        // 将持久化缓存的值放入内存缓存
        this.setMemoryCache(fullKey, persistentValue, this.config.memoryTtl)
        this.stats.persistentHits++
        this.updateHitRate()
        return persistentValue
      }
    }
    catch (error) {
      console.warn('获取持久化缓存失败:', error)
    }

    // 3. 缓存未命中
    this.stats.misses++
    this.updateHitRate()
    return null
  }

  /**
   * 设置缓存值
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const fullKey = this.getFullKey(key)
    const memoryTtl = ttl || this.config.memoryTtl
    const persistentTtl = ttl || this.config.persistentTtl

    // 设置内存缓存
    this.setMemoryCache(fullKey, value, memoryTtl)

    // 设置持久化缓存
    try {
      await this.setPersistentCache(fullKey, value, persistentTtl)
    }
    catch (error) {
      console.warn('设置持久化缓存失败:', error)
    }

    this.updateStats()
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.getFullKey(key)

    // 删除内存缓存
    this.memoryCache.delete(fullKey)

    // 删除持久化缓存
    try {
      await this.deletePersistentCache(fullKey)
    }
    catch (error) {
      console.warn('删除持久化缓存失败:', error)
    }

    this.updateStats()
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    // 清空内存缓存
    this.memoryCache.clear()

    // 清空持久化缓存
    try {
      const keys = await this.getAllPersistentKeys()
      for (const key of keys) {
        if (key.startsWith(this.config.keyPrefix)) {
          await this.deletePersistentCache(key)
        }
      }
    }
    catch (error) {
      console.warn('清空持久化缓存失败:', error)
    }

    this.resetStats()
  }

  /**
   * 检查缓存是否存在
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== null
  }

  // ==================== 权限专用缓存方法 ====================

  /**
   * 缓存用户角色信息
   */
  async cacheUserRole(userId: string | number, role: Role): Promise<void> {
    const key = `user_role_${userId}`
    await this.set(key, role, this.config.persistentTtl)
  }

  /**
   * 获取缓存的用户角色信息
   */
  async getCachedUserRole(userId: string | number): Promise<Role | null> {
    const key = `user_role_${userId}`
    return await this.get<Role>(key)
  }

  /**
   * 缓存权限检查结果
   */
  async cachePermissionResult(
    userId: string | number,
    role: UserRole,
    action: string,
    resourceType: string,
    resourceId: string,
    result: PermissionCheckResult,
  ): Promise<void> {
    const key = `permission_${userId}_${role}_${action}_${resourceType}_${resourceId}`
    await this.set(key, result, this.config.memoryTtl) // 权限检查结果使用较短的TTL
  }

  /**
   * 获取缓存的权限检查结果
   */
  async getCachedPermissionResult(
    userId: string | number,
    role: UserRole,
    action: string,
    resourceType: string,
    resourceId: string,
  ): Promise<PermissionCheckResult | null> {
    const key = `permission_${userId}_${role}_${action}_${resourceType}_${resourceId}`
    return await this.get<PermissionCheckResult>(key)
  }

  /**
   * 缓存角色权限列表
   */
  async cacheRolePermissions(role: UserRole, permissions: Permission[]): Promise<void> {
    const key = `role_permissions_${role}`
    await this.set(key, permissions, this.config.persistentTtl)
  }

  /**
   * 获取缓存的角色权限列表
   */
  async getCachedRolePermissions(role: UserRole): Promise<Permission[] | null> {
    const key = `role_permissions_${role}`
    return await this.get<Permission[]>(key)
  }

  /**
   * 预加载用户相关权限
   */
  async preloadUserPermissions(userId: string | number, roles: UserRole[]): Promise<void> {
    if (!this.config.enablePreload) {
      return
    }

    for (const role of roles) {
      const preloadKey = `preload_${userId}_${role}`
      if (!this.preloadQueue.has(preloadKey)) {
        this.preloadQueue.add(preloadKey)

        // 延迟预加载，避免阻塞主线程
        setTimeout(async () => {
          try {
            // 这里可以调用API预加载权限数据
            // 实际实现中需要注入权限服务
            console.debug(`预加载用户权限: ${userId}, 角色: ${role}`)
          }
          catch (error) {
            console.warn('预加载权限失败:', error)
          }
          finally {
            this.preloadQueue.delete(preloadKey)
          }
        }, this.config.preloadDelay)
      }
    }
  }

  // ==================== 缓存管理方法 ====================

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    this.updateStats()
    return { ...this.stats }
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    // 清理内存缓存
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      this.memoryCache.delete(key)
    }

    this.updateStats()
    console.debug(`清理了 ${expiredKeys.length} 个过期缓存条目`)
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.memoryCache.clear()
    this.preloadQueue.clear()
  }

  // ==================== 私有方法 ====================

  /**
   * 获取完整缓存键
   */
  private getFullKey(key: string): string {
    return `${this.config.keyPrefix}${key}`
  }

  /**
   * 检查缓存条目是否过期
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt
  }

  /**
   * 更新访问信息
   */
  private updateAccessInfo(entry: CacheEntry): void {
    entry.accessCount++
    entry.lastAccessAt = Date.now()
  }

  /**
   * 设置内存缓存
   */
  private setMemoryCache<T>(key: string, value: T, ttl: number): void {
    // 检查是否需要清理空间
    if (this.memoryCache.size >= this.config.maxMemoryEntries) {
      this.evictLeastRecentlyUsed()
    }

    const now = Date.now()
    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      expiresAt: now + ttl,
      accessCount: 1,
      lastAccessAt: now,
    }

    this.memoryCache.set(key, entry)
  }

  /**
   * 淘汰最近最少使用的缓存条目
   */
  private evictLeastRecentlyUsed(): void {
    let lruKey: string | null = null
    let lruTime = Date.now()

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessAt < lruTime) {
        lruTime = entry.lastAccessAt
        lruKey = key
      }
    }

    if (lruKey) {
      this.memoryCache.delete(lruKey)
    }
  }

  /**
   * 获取持久化缓存
   */
  private async getPersistentCache<T>(key: string): Promise<T | null> {
    try {
      const value = uni.getStorageSync(key)
      if (value) {
        const entry: CacheEntry<T> = JSON.parse(value)
        if (!this.isExpired(entry)) {
          return entry.value
        }
        else {
          // 删除过期的持久化缓存
          uni.removeStorageSync(key)
        }
      }
    }
    catch (error) {
      console.warn('读取持久化缓存失败:', error)
    }
    return null
  }

  /**
   * 设置持久化缓存
   */
  private async setPersistentCache<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      const now = Date.now()
      const entry: CacheEntry<T> = {
        value,
        createdAt: now,
        expiresAt: now + ttl,
        accessCount: 1,
        lastAccessAt: now,
      }
      uni.setStorageSync(key, JSON.stringify(entry))
    }
    catch (error) {
      console.warn('设置持久化缓存失败:', error)
    }
  }

  /**
   * 删除持久化缓存
   */
  private async deletePersistentCache(key: string): Promise<void> {
    try {
      uni.removeStorageSync(key)
    }
    catch (error) {
      console.warn('删除持久化缓存失败:', error)
    }
  }

  /**
   * 获取所有持久化缓存键
   */
  private async getAllPersistentKeys(): Promise<string[]> {
    try {
      const info = uni.getStorageInfoSync()
      return info.keys || []
    }
    catch (error) {
      console.warn('获取持久化缓存键失败:', error)
      return []
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.memoryEntries = this.memoryCache.size
    // 持久化缓存条目数需要异步获取，这里简化处理
    this.updateHitRate()
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    if (this.stats.totalRequests > 0) {
      const totalHits = this.stats.memoryHits + this.stats.persistentHits
      this.stats.hitRate = totalHits / this.stats.totalRequests
    }
  }

  /**
   * 重置统计信息
   */
  private resetStats(): void {
    this.stats = {
      memoryHits: 0,
      persistentHits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      memoryEntries: 0,
      persistentEntries: 0,
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    // 每5分钟清理一次过期缓存
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000) as any
  }
}

// ==================== 单例实例 ====================

let cacheManagerInstance: PermissionCacheManager | null = null

/**
 * 获取权限缓存管理器单例
 */
export function getPermissionCacheManager(): PermissionCacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new PermissionCacheManager()
  }
  return cacheManagerInstance
}

/**
 * 重置权限缓存管理器单例
 */
export function resetPermissionCacheManager(): void {
  if (cacheManagerInstance) {
    cacheManagerInstance.destroy()
    cacheManagerInstance = null
  }
}
