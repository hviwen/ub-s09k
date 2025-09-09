/**
 * 权限性能监控器 - 性能监控和优化
 * @description 监控权限检查性能，提供性能分析和优化建议
 * @author unibest权限管理系统
 * @version 1.0.0
 */

// ==================== 性能监控类型定义 ====================

/**
 * 性能指标
 */
interface PerformanceMetric {
  /** 操作名称 */
  operation: string
  /** 开始时间 */
  startTime: number
  /** 结束时间 */
  endTime: number
  /** 执行时长（毫秒） */
  duration: number
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
  /** 额外元数据 */
  metadata?: Record<string, any>
}

/**
 * 性能统计
 */
interface PerformanceStats {
  /** 操作名称 */
  operation: string
  /** 总调用次数 */
  totalCalls: number
  /** 成功次数 */
  successCalls: number
  /** 失败次数 */
  failedCalls: number
  /** 平均执行时长 */
  averageDuration: number
  /** 最小执行时长 */
  minDuration: number
  /** 最大执行时长 */
  maxDuration: number
  /** 成功率 */
  successRate: number
  /** 最近更新时间 */
  lastUpdated: number
}

/**
 * 性能报告
 */
interface PerformanceReport {
  /** 报告生成时间 */
  generatedAt: number
  /** 监控时间范围 */
  timeRange: {
    start: number
    end: number
  }
  /** 总体统计 */
  overall: {
    totalOperations: number
    averageDuration: number
    successRate: number
  }
  /** 各操作统计 */
  operations: PerformanceStats[]
  /** 性能警告 */
  warnings: PerformanceWarning[]
  /** 优化建议 */
  recommendations: PerformanceRecommendation[]
}

/**
 * 性能警告
 */
interface PerformanceWarning {
  /** 警告类型 */
  type: 'slow_operation' | 'high_failure_rate' | 'memory_usage' | 'cache_miss'
  /** 警告级别 */
  level: 'info' | 'warning' | 'error'
  /** 警告消息 */
  message: string
  /** 相关操作 */
  operation?: string
  /** 警告值 */
  value?: number
  /** 阈值 */
  threshold?: number
}

/**
 * 性能优化建议
 */
interface PerformanceRecommendation {
  /** 建议类型 */
  type: 'caching' | 'preload' | 'batch' | 'optimization'
  /** 建议标题 */
  title: string
  /** 建议描述 */
  description: string
  /** 预期收益 */
  expectedBenefit: string
  /** 实施难度 */
  difficulty: 'low' | 'medium' | 'high'
  /** 相关操作 */
  operations?: string[]
}

// ==================== 性能监控器实现 ====================

/**
 * 权限性能监控器
 */
export class PermissionPerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private stats: Map<string, PerformanceStats> = new Map()
  private activeOperations: Map<string, number> = new Map()
  private config: {
    maxMetrics: number
    slowOperationThreshold: number
    highFailureRateThreshold: number
    enableAutoReport: boolean
    reportInterval: number
  }

  constructor(config: Partial<typeof PermissionPerformanceMonitor.prototype.config> = {}) {
    this.config = {
      maxMetrics: 1000,
      slowOperationThreshold: 100, // 100ms
      highFailureRateThreshold: 0.1, // 10%
      enableAutoReport: true,
      reportInterval: 5 * 60 * 1000, // 5分钟
      ...config,
    }

    if (this.config.enableAutoReport) {
      this.startAutoReport()
    }
  }

  // ==================== 性能监控方法 ====================

  /**
   * 开始监控操作
   */
  startOperation(operation: string, metadata?: Record<string, any>): string {
    const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.activeOperations.set(operationId, Date.now())

    if (import.meta.env.DEV) {
      console.debug(`开始监控操作: ${operation}`, metadata)
    }

    return operationId
  }

  /**
   * 结束监控操作
   */
  endOperation(operationId: string, success: boolean = true, error?: string, metadata?: Record<string, any>): void {
    const startTime = this.activeOperations.get(operationId)
    if (!startTime) {
      console.warn(`未找到操作ID: ${operationId}`)
      return
    }

    const endTime = Date.now()
    const duration = endTime - startTime
    const operation = operationId.split('_')[0]

    const metric: PerformanceMetric = {
      operation,
      startTime,
      endTime,
      duration,
      success,
      error,
      metadata,
    }

    this.addMetric(metric)
    this.activeOperations.delete(operationId)

    if (import.meta.env.DEV) {
      console.debug(`结束监控操作: ${operation}, 耗时: ${duration}ms, 成功: ${success}`)
    }
  }

  /**
   * 监控异步操作
   */
  async monitorAsync<T>(
    operation: string,
    asyncFn: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    const operationId = this.startOperation(operation, metadata)

    try {
      const result = await asyncFn()
      this.endOperation(operationId, true, undefined, metadata)
      return result
    }
    catch (error) {
      this.endOperation(operationId, false, error instanceof Error ? error.message : String(error), metadata)
      throw error
    }
  }

  /**
   * 监控同步操作
   */
  monitorSync<T>(
    operation: string,
    syncFn: () => T,
    metadata?: Record<string, any>,
  ): T {
    const operationId = this.startOperation(operation, metadata)

    try {
      const result = syncFn()
      this.endOperation(operationId, true, undefined, metadata)
      return result
    }
    catch (error) {
      this.endOperation(operationId, false, error instanceof Error ? error.message : String(error), metadata)
      throw error
    }
  }

  // ==================== 统计和报告方法 ====================

  /**
   * 获取操作统计
   */
  getOperationStats(operation: string): PerformanceStats | null {
    return this.stats.get(operation) || null
  }

  /**
   * 获取所有统计
   */
  getAllStats(): PerformanceStats[] {
    return Array.from(this.stats.values())
  }

  /**
   * 生成性能报告
   */
  generateReport(timeRange?: { start: number, end: number }): PerformanceReport {
    const now = Date.now()
    const range = timeRange || {
      start: now - 24 * 60 * 60 * 1000, // 默认24小时
      end: now,
    }

    // 过滤时间范围内的指标
    const filteredMetrics = this.metrics.filter(
      metric => metric.startTime >= range.start && metric.startTime <= range.end,
    )

    // 计算总体统计
    const totalOperations = filteredMetrics.length
    const averageDuration = totalOperations > 0
      ? filteredMetrics.reduce((sum, metric) => sum + metric.duration, 0) / totalOperations
      : 0
    const successRate = totalOperations > 0
      ? filteredMetrics.filter(metric => metric.success).length / totalOperations
      : 1

    // 获取操作统计
    const operations = this.getAllStats()

    // 生成警告
    const warnings = this.generateWarnings(operations)

    // 生成建议
    const recommendations = this.generateRecommendations(operations, warnings)

    return {
      generatedAt: now,
      timeRange: range,
      overall: {
        totalOperations,
        averageDuration,
        successRate,
      },
      operations,
      warnings,
      recommendations,
    }
  }

  /**
   * 清理旧指标
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge
    this.metrics = this.metrics.filter(metric => metric.startTime > cutoff)

    // 重新计算统计
    this.recalculateStats()
  }

  /**
   * 重置所有数据
   */
  reset(): void {
    this.metrics = []
    this.stats.clear()
    this.activeOperations.clear()
  }

  // ==================== 私有方法 ====================

  /**
   * 添加性能指标
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric)

    // 限制指标数量
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics)
    }

    // 更新统计
    this.updateStats(metric)
  }

  /**
   * 更新统计信息
   */
  private updateStats(metric: PerformanceMetric): void {
    const existing = this.stats.get(metric.operation)

    if (existing) {
      existing.totalCalls++
      if (metric.success) {
        existing.successCalls++
      }
      else {
        existing.failedCalls++
      }

      existing.minDuration = Math.min(existing.minDuration, metric.duration)
      existing.maxDuration = Math.max(existing.maxDuration, metric.duration)

      // 重新计算平均时长
      const totalDuration = existing.averageDuration * (existing.totalCalls - 1) + metric.duration
      existing.averageDuration = totalDuration / existing.totalCalls

      existing.successRate = existing.successCalls / existing.totalCalls
      existing.lastUpdated = Date.now()
    }
    else {
      const newStats: PerformanceStats = {
        operation: metric.operation,
        totalCalls: 1,
        successCalls: metric.success ? 1 : 0,
        failedCalls: metric.success ? 0 : 1,
        averageDuration: metric.duration,
        minDuration: metric.duration,
        maxDuration: metric.duration,
        successRate: metric.success ? 1 : 0,
        lastUpdated: Date.now(),
      }
      this.stats.set(metric.operation, newStats)
    }
  }

  /**
   * 重新计算统计信息
   */
  private recalculateStats(): void {
    this.stats.clear()
    for (const metric of this.metrics) {
      this.updateStats(metric)
    }
  }

  /**
   * 生成性能警告
   */
  private generateWarnings(operations: PerformanceStats[]): PerformanceWarning[] {
    const warnings: PerformanceWarning[] = []

    for (const op of operations) {
      // 检查慢操作
      if (op.averageDuration > this.config.slowOperationThreshold) {
        warnings.push({
          type: 'slow_operation',
          level: op.averageDuration > this.config.slowOperationThreshold * 2 ? 'error' : 'warning',
          message: `操作 ${op.operation} 平均执行时间过长`,
          operation: op.operation,
          value: op.averageDuration,
          threshold: this.config.slowOperationThreshold,
        })
      }

      // 检查高失败率
      if (op.successRate < (1 - this.config.highFailureRateThreshold)) {
        warnings.push({
          type: 'high_failure_rate',
          level: op.successRate < 0.5 ? 'error' : 'warning',
          message: `操作 ${op.operation} 失败率过高`,
          operation: op.operation,
          value: 1 - op.successRate,
          threshold: this.config.highFailureRateThreshold,
        })
      }
    }

    return warnings
  }

  /**
   * 生成性能优化建议
   */
  private generateRecommendations(
    operations: PerformanceStats[],
    warnings: PerformanceWarning[],
  ): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = []

    // 基于慢操作的建议
    const slowOperations = warnings
      .filter(w => w.type === 'slow_operation')
      .map(w => w.operation!)

    if (slowOperations.length > 0) {
      if (slowOperations.some(op => op.includes('permission_check'))) {
        recommendations.push({
          type: 'caching',
          title: '启用权限检查缓存',
          description: '对频繁的权限检查结果进行缓存，减少重复计算',
          expectedBenefit: '可减少50-80%的权限检查时间',
          difficulty: 'low',
          operations: slowOperations.filter(op => op.includes('permission_check')),
        })
      }

      if (slowOperations.some(op => op.includes('role_switch'))) {
        recommendations.push({
          type: 'preload',
          title: '预加载角色信息',
          description: '在用户登录时预加载可能需要的角色信息',
          expectedBenefit: '可减少角色切换时间30-50%',
          difficulty: 'medium',
          operations: slowOperations.filter(op => op.includes('role_switch')),
        })
      }
    }

    // 基于高失败率的建议
    const failedOperations = warnings
      .filter(w => w.type === 'high_failure_rate')
      .map(w => w.operation!)

    if (failedOperations.length > 0) {
      recommendations.push({
        type: 'optimization',
        title: '优化错误处理',
        description: '改进错误处理逻辑，增加重试机制和降级策略',
        expectedBenefit: '可提高操作成功率10-20%',
        difficulty: 'medium',
        operations: failedOperations,
      })
    }

    return recommendations
  }

  /**
   * 启动自动报告
   */
  private startAutoReport(): void {
    setInterval(() => {
      const report = this.generateReport()

      if (import.meta.env.DEV) {
        console.group('权限系统性能报告')
        console.log('总体统计:', report.overall)
        console.log('操作统计:', report.operations)
        if (report.warnings.length > 0) {
          console.warn('性能警告:', report.warnings)
        }
        if (report.recommendations.length > 0) {
          console.info('优化建议:', report.recommendations)
        }
        console.groupEnd()
      }

      // 清理旧数据
      this.cleanup()
    }, this.config.reportInterval)
  }
}

// ==================== 单例实例 ====================

let performanceMonitorInstance: PermissionPerformanceMonitor | null = null

/**
 * 获取权限性能监控器单例
 */
export function getPermissionPerformanceMonitor(): PermissionPerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PermissionPerformanceMonitor()
  }
  return performanceMonitorInstance
}

/**
 * 重置权限性能监控器单例
 */
export function resetPermissionPerformanceMonitor(): void {
  performanceMonitorInstance = null
}

// ==================== 装饰器工具 ====================

/**
 * 性能监控装饰器
 */
export function monitorPerformance(operation: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const monitor = getPermissionPerformanceMonitor()

    descriptor.value = async function (...args: any[]) {
      return await monitor.monitorAsync(
        `${operation}_${propertyKey}`,
        () => originalMethod.apply(this, args),
        { className: target.constructor.name, method: propertyKey },
      )
    }

    return descriptor
  }
}
