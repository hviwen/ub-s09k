/**
 * 权限系统性能优化配置
 * @description 集中管理性能相关的配置参数
 * @author unibest权限管理系统
 * @version 1.0.0
 */

// ==================== 性能配置接口 ====================

/**
 * 缓存配置
 */
export interface CacheConfig {
  /** 用户角色信息缓存时间（毫秒） */
  userRoleTTL: number
  /** 权限检查结果缓存时间（毫秒） */
  permissionCheckTTL: number
  /** 规则匹配结果缓存时间（毫秒） */
  ruleMatchTTL: number
  /** 最大缓存条目数 */
  maxCacheSize: number
  /** 缓存清理间隔（毫秒） */
  cleanupInterval: number
}

/**
 * 启动优化配置
 */
export interface StartupOptimizationConfig {
  /** 快速启动超时时间（毫秒） */
  quickStartTimeout: number
  /** 预加载权限数量 */
  preloadPermissionCount: number
  /** 是否启用并行缓存 */
  enableParallelCache: boolean
  /** 是否启用动态超时 */
  enableDynamicTimeout: boolean
  /** 网络类型超时倍数 */
  networkTimeoutMultipliers: Record<string, number>
}

/**
 * 角色切换优化配置
 */
export interface RoleSwitchOptimizationConfig {
  /** 是否默认启用异步切换 */
  defaultAsyncSwitch: boolean
  /** 切换操作超时时间（毫秒） */
  switchTimeout: number
  /** 最大并发切换数 */
  maxConcurrentSwitches: number
  /** 切换历史保留数量 */
  maxHistoryRecords: number
}

/**
 * 权限检查优化配置
 */
export interface PermissionCheckOptimizationConfig {
  /** 是否启用规则索引 */
  enableRuleIndex: boolean
  /** 批量检查最大数量 */
  maxBatchSize: number
  /** 权限检查超时时间（毫秒） */
  checkTimeout: number
  /** 是否启用权限预计算 */
  enablePrecomputation: boolean
}

/**
 * 完整的性能配置
 */
export interface PerformanceConfig {
  cache: CacheConfig
  startup: StartupOptimizationConfig
  roleSwitch: RoleSwitchOptimizationConfig
  permissionCheck: PermissionCheckOptimizationConfig
}

// ==================== 默认配置 ====================

/**
 * 默认缓存配置
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  userRoleTTL: 30 * 60 * 1000, // 30分钟
  permissionCheckTTL: 5 * 60 * 1000, // 5分钟
  ruleMatchTTL: 10 * 60 * 1000, // 10分钟
  maxCacheSize: 1000,
  cleanupInterval: 5 * 60 * 1000, // 5分钟
}

/**
 * 默认启动优化配置
 */
export const DEFAULT_STARTUP_CONFIG: StartupOptimizationConfig = {
  quickStartTimeout: 2000, // 2秒
  preloadPermissionCount: 10,
  enableParallelCache: true,
  enableDynamicTimeout: true,
  networkTimeoutMultipliers: {
    wifi: 0.8,
    '4g': 1.0,
    '3g': 1.5,
    '2g': 2.0,
    unknown: 1.0,
  },
}

/**
 * 默认角色切换优化配置
 */
export const DEFAULT_ROLE_SWITCH_CONFIG: RoleSwitchOptimizationConfig = {
  defaultAsyncSwitch: false, // 保持向后兼容
  switchTimeout: 10000, // 10秒
  maxConcurrentSwitches: 3,
  maxHistoryRecords: 50,
}

/**
 * 默认权限检查优化配置
 */
export const DEFAULT_PERMISSION_CHECK_CONFIG: PermissionCheckOptimizationConfig = {
  enableRuleIndex: true,
  maxBatchSize: 50,
  checkTimeout: 5000, // 5秒
  enablePrecomputation: false, // 实验性功能，默认关闭
}

/**
 * 默认性能配置
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  cache: DEFAULT_CACHE_CONFIG,
  startup: DEFAULT_STARTUP_CONFIG,
  roleSwitch: DEFAULT_ROLE_SWITCH_CONFIG,
  permissionCheck: DEFAULT_PERMISSION_CHECK_CONFIG,
}

// ==================== 配置工厂函数 ====================

/**
 * 创建性能配置
 * @param overrides 配置覆盖
 * @returns 合并后的配置
 */
export function createPerformanceConfig(
  overrides: Partial<{
    cache: Partial<CacheConfig>
    startup: Partial<StartupOptimizationConfig>
    roleSwitch: Partial<RoleSwitchOptimizationConfig>
    permissionCheck: Partial<PermissionCheckOptimizationConfig>
  }> = {}
): PerformanceConfig {
  return {
    cache: { ...DEFAULT_CACHE_CONFIG, ...overrides.cache },
    startup: { ...DEFAULT_STARTUP_CONFIG, ...overrides.startup },
    roleSwitch: { ...DEFAULT_ROLE_SWITCH_CONFIG, ...overrides.roleSwitch },
    permissionCheck: { ...DEFAULT_PERMISSION_CHECK_CONFIG, ...overrides.permissionCheck },
  }
}

/**
 * 根据环境创建配置
 * @param env 环境类型
 * @returns 环境特定的配置
 */
export function createEnvironmentConfig(env: 'development' | 'production' | 'test'): PerformanceConfig {
  const baseConfig = DEFAULT_PERFORMANCE_CONFIG

  switch (env) {
    case 'development':
      return createPerformanceConfig({
        cache: {
          userRoleTTL: 5 * 60 * 1000, // 开发环境缩短缓存时间
          permissionCheckTTL: 1 * 60 * 1000,
        },
        startup: {
          quickStartTimeout: 5000, // 开发环境延长超时
          preloadPermissionCount: 5, // 减少预加载数量
        },
      })

    case 'test':
      return createPerformanceConfig({
        cache: {
          userRoleTTL: 1000, // 测试环境使用短缓存
          permissionCheckTTL: 500,
          ruleMatchTTL: 1000,
        },
        startup: {
          quickStartTimeout: 1000,
          preloadPermissionCount: 3,
        },
      })

    case 'production':
    default:
      return baseConfig
  }
}
