/**
 * 内容访问控制器 - 细粒度内容权限控制
 * @description 实现基于角色的内容访问控制，支持动态权限配置
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import type { IContentAccessController } from '../interfaces'
import type { ContentAccessConfig } from '../types'
import { AccessControlAction, UserRole } from '../types'
import {
  createContentAccessConfig,
  checkRoleContentAccess,
  getDefaultContentAccessConfig,
  CONTENT_TYPE_PERMISSION_MAP,
} from '../config/DesignPermissionMatrix'

// ==================== 内容访问规则定义 ====================

/**
 * 内容访问规则
 */
interface ContentAccessRule {
  contentId: string
  contentType: string
  roleRules: Map<UserRole, AccessControlAction>
  defaultAction: AccessControlAction
  conditions?: ContentAccessCondition[]
  metadata?: Record<string, any>
}

/**
 * 内容访问条件
 */
interface ContentAccessCondition {
  type: 'time' | 'location' | 'device' | 'custom'
  condition: (context: ContentAccessContext) => boolean
  action: AccessControlAction
  message?: string
}

/**
 * 内容访问上下文
 */
interface ContentAccessContext {
  userId: string | number
  role: UserRole
  contentId: string
  timestamp: number
  userAgent?: string
  location?: { latitude: number; longitude: number }
  extra?: Record<string, any>
}

/**
 * 内容访问结果
 */
interface ContentAccessResult {
  action: AccessControlAction
  message?: string
  redirectUrl?: string
  metadata?: Record<string, any>
}

// ==================== 内容访问控制器实现 ====================

/**
 * 内容访问控制器
 */
export class ContentAccessController implements IContentAccessController {
  private accessRules: Map<string, ContentAccessRule>
  private globalRules: ContentAccessRule[]
  private accessLog: Map<string, ContentAccessLog[]>
  private debugMode: boolean

  constructor(options: { debugMode?: boolean } = {}) {
    this.accessRules = new Map()
    this.globalRules = []
    this.accessLog = new Map()
    this.debugMode = options.debugMode || false

    this.initializeDefaultRules()
  }

  /**
   * 初始化默认访问规则
   */
  private initializeDefaultRules(): void {
    // 基于设计文档的权限矩阵初始化规则
    Object.entries(CONTENT_TYPE_PERMISSION_MAP).forEach(([contentType, roleAccessRules]) => {
      this.registerContentAccessRule({
        contentId: contentType,
        contentType,
        roleAccessRules,
        defaultAction: AccessControlAction.COMPLETE_RESTRICTION,
      })
    })

    // 注册默认内容访问配置
    const defaultConfigs = [
      'home',
      'about',
      'help',
      'profile',
      'investment',
      'channel_dashboard',
      'commission',
      'institutional_dashboard',
      'risk_control',
    ]

    defaultConfigs.forEach(contentId => {
      const config = getDefaultContentAccessConfig(contentId)
      if (config) {
        this.registerContentAccessRule({
          contentId: config.contentId,
          contentType: config.contentType,
          roleAccessRules: config.roleAccessRules,
          defaultAction: config.defaultAction,
        })
      }
    })

    if (this.debugMode) {
      console.log('已初始化基于设计文档的内容访问规则')
    }
  }

  /**
   * 检查内容访问权限
   */
  async checkContentAccess(contentId: string, role: UserRole, context?: any): Promise<AccessControlAction> {
    try {
      const accessContext: ContentAccessContext = {
        userId: context?.userId || 'anonymous',
        role,
        contentId,
        timestamp: Date.now(),
        userAgent: context?.userAgent,
        location: context?.location,
        extra: context,
      }

      // 记录访问日志
      this.logAccess(accessContext)

      // 检查具体内容规则
      const specificResult = await this.checkSpecificContentRule(accessContext)
      if (specificResult) {
        return specificResult.action
      }

      // 检查通用规则
      const generalResult = await this.checkGeneralContentRules(accessContext)
      if (generalResult) {
        return generalResult.action
      }

      // 检查全局规则
      const globalResult = await this.checkGlobalRules(accessContext)
      if (globalResult) {
        return globalResult.action
      }

      // 默认策略
      return this.getDefaultAccessAction(role)
    } catch (error) {
      console.error('内容访问检查失败:', error)
      return AccessControlAction.COMPLETE_RESTRICTION
    }
  }

  /**
   * 检查具体内容规则
   */
  private async checkSpecificContentRule(context: ContentAccessContext): Promise<ContentAccessResult | null> {
    const rule = this.accessRules.get(context.contentId)
    if (!rule) {
      return null
    }

    return this.evaluateRule(rule, context)
  }

  /**
   * 检查通用内容规则（基于内容类型）
   */
  private async checkGeneralContentRules(context: ContentAccessContext): Promise<ContentAccessResult | null> {
    // 首先尝试使用设计文档的权限矩阵
    const designMatrixResult = this.checkDesignMatrixRules(context)
    if (designMatrixResult) {
      return designMatrixResult
    }

    // 根据内容ID模式匹配规则
    for (const [ruleId, rule] of this.accessRules) {
      if (this.matchContentPattern(ruleId, context.contentId)) {
        const result = await this.evaluateRule(rule, context)
        if (result) {
          return result
        }
      }
    }

    return null
  }

  /**
   * 使用设计文档权限矩阵检查权限
   */
  private checkDesignMatrixRules(context: ContentAccessContext): ContentAccessResult | null {
    // 尝试从内容ID推断内容类型
    const contentType = this.inferContentTypeFromId(context.contentId)

    if (contentType && contentType in CONTENT_TYPE_PERMISSION_MAP) {
      const action = checkRoleContentAccess(context.role, contentType as keyof typeof CONTENT_TYPE_PERMISSION_MAP)

      return {
        action,
        message: this.getActionMessage(action, context.role, contentType),
        metadata: {
          source: 'design_matrix',
          contentType,
          appliedRule: 'role_visibility_range',
        },
      }
    }

    return null
  }

  /**
   * 从内容ID推断内容类型
   */
  private inferContentTypeFromId(contentId: string): string | null {
    // 内容ID到内容类型的映射规则
    const idToTypeMap: Record<string, string> = {
      home: 'public_content',
      about: 'public_content',
      help: 'help_document',
      profile: 'user_profile',
      investment: 'investment_record',
      channel_dashboard: 'channel_data',
      commission: 'commission_report',
      institutional_dashboard: 'institutional_data',
      risk_control: 'risk_management',
    }

    // 直接映射
    if (idToTypeMap[contentId]) {
      return idToTypeMap[contentId]
    }

    // 模式匹配
    if (contentId.includes('channel')) return 'channel_data'
    if (contentId.includes('institutional')) return 'institutional_data'
    if (contentId.includes('user') || contentId.includes('profile')) return 'user_profile'
    if (contentId.includes('public') || contentId.includes('announcement')) return 'public_content'

    return null
  }

  /**
   * 获取访问控制动作的消息（增强版本，支持内容类型）
   */
  private getActionMessage(action: AccessControlAction, role: UserRole, contentType?: string): string {
    const roleNames = {
      [UserRole.GUEST]: '游客',
      [UserRole.REGULAR]: '普通客户',
      [UserRole.CHANNEL]: '渠道经理',
      [UserRole.INSTITUTIONAL]: '机构经理',
      [UserRole.ADMIN]: '管理员',
    }

    const roleName = roleNames[role] || role
    const content = contentType ? `${contentType}内容` : '此内容'

    switch (action) {
      case AccessControlAction.UNRESTRICTED_ACCESS:
        return `${roleName}可以完全访问${content}`
      case AccessControlAction.COMPLETE_RESTRICTION:
        return `${roleName}无权访问${content}`
      case AccessControlAction.READ_ONLY:
        return `${roleName}只能查看${content}`
      case AccessControlAction.LOGIN_GUIDANCE:
        return '请先登录以访问此内容'
      case AccessControlAction.ROLE_SWITCH_GUIDANCE:
        return '请切换到相应角色以访问此内容'
      case AccessControlAction.APPROVAL_PENDING:
        return '您的访问申请正在审核中'
      case AccessControlAction.ACCOUNT_EXCEPTION:
        return '账户状态异常，请联系管理员'
      default:
        return '访问受限'
    }
  }

  /**
   * 检查全局规则
   */
  private async checkGlobalRules(context: ContentAccessContext): Promise<ContentAccessResult | null> {
    for (const rule of this.globalRules) {
      const result = await this.evaluateRule(rule, context)
      if (result) {
        return result
      }
    }

    return null
  }

  /**
   * 评估访问规则
   */
  private async evaluateRule(
    rule: ContentAccessRule,
    context: ContentAccessContext
  ): Promise<ContentAccessResult | null> {
    // 检查条件
    if (rule.conditions) {
      for (const condition of rule.conditions) {
        if (condition.condition(context)) {
          return {
            action: condition.action,
            message: condition.message,
            metadata: { ruleType: 'condition', conditionType: condition.type },
          }
        }
      }
    }

    // 检查角色规则
    const roleAction = rule.roleRules.get(context.role)
    if (roleAction !== undefined) {
      return {
        action: roleAction,
        message: this.getActionMessage(roleAction, context.role),
        metadata: { ruleType: 'role', role: context.role },
      }
    }

    // 返回默认动作
    return {
      action: rule.defaultAction,
      message: this.getActionMessage(rule.defaultAction, context.role),
      metadata: { ruleType: 'default' },
    }
  }

  /**
   * 内容模式匹配
   */
  private matchContentPattern(pattern: string, contentId: string): boolean {
    // 支持通配符匹配
    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*')
      const regex = new RegExp(`^${regexPattern}$`)
      return regex.test(contentId)
    }

    // 支持前缀匹配
    if (pattern.endsWith('_')) {
      return contentId.startsWith(pattern.slice(0, -1))
    }

    return pattern === contentId
  }

  /**
   * 获取默认访问动作
   */
  private getDefaultAccessAction(role: UserRole): AccessControlAction {
    switch (role) {
      case UserRole.GUEST:
        return AccessControlAction.LOGIN_GUIDANCE
      case UserRole.REGULAR:
        return AccessControlAction.READ_ONLY
      case UserRole.CHANNEL:
      case UserRole.INSTITUTIONAL:
        return AccessControlAction.UNRESTRICTED_ACCESS
      case UserRole.ADMIN:
        return AccessControlAction.UNRESTRICTED_ACCESS
      default:
        return AccessControlAction.COMPLETE_RESTRICTION
    }
  }

  /**
   * 注册内容访问规则
   */
  registerContentAccessRule(config: ContentAccessConfig): void {
    const rule: ContentAccessRule = {
      contentId: config.contentId,
      contentType: config.contentType,
      roleRules: new Map(
        Object.entries(config.roleAccessRules).map(([key, value]) => [
          UserRole[key as keyof typeof UserRole],
          value as AccessControlAction,
        ])
      ),
      defaultAction: config.defaultAction,
      conditions: config.customChecker
        ? [
            {
              type: 'custom',
              condition: context =>
                config.customChecker!(context.role, context) === AccessControlAction.UNRESTRICTED_ACCESS,
              action: AccessControlAction.UNRESTRICTED_ACCESS,
            },
          ]
        : undefined,
    }

    this.accessRules.set(config.contentId, rule)

    if (this.debugMode) {
      console.log(`注册内容访问规则: ${config.contentId}`, rule)
    }
  }

  /**
   * 批量检查内容访问权限
   */
  async batchCheckContentAccess(contentIds: string[], role: UserRole): Promise<Record<string, AccessControlAction>> {
    const results: Record<string, AccessControlAction> = {}

    // 并行检查所有内容
    const promises = contentIds.map(async contentId => {
      const action = await this.checkContentAccess(contentId, role)
      return { contentId, action }
    })

    const resolvedResults = await Promise.all(promises)

    resolvedResults.forEach(({ contentId, action }) => {
      results[contentId] = action
    })

    return results
  }

  /**
   * 添加内容访问条件
   */
  addContentAccessCondition(contentId: string, condition: ContentAccessCondition): void {
    const rule = this.accessRules.get(contentId)
    if (rule) {
      if (!rule.conditions) {
        rule.conditions = []
      }
      rule.conditions.push(condition)
    }
  }

  /**
   * 创建时间限制条件
   */
  createTimeCondition(
    startTime: number,
    endTime: number,
    action: AccessControlAction = AccessControlAction.COMPLETE_RESTRICTION
  ): ContentAccessCondition {
    return {
      type: 'time',
      condition: context => {
        const now = context.timestamp
        return now < startTime || now > endTime
      },
      action,
      message: '内容访问时间受限',
    }
  }

  /**
   * 创建设备限制条件
   */
  createDeviceCondition(
    allowedDevices: string[],
    action: AccessControlAction = AccessControlAction.COMPLETE_RESTRICTION
  ): ContentAccessCondition {
    return {
      type: 'device',
      condition: context => {
        if (!context.userAgent) return false
        return !allowedDevices.some(device => context.userAgent!.toLowerCase().includes(device.toLowerCase()))
      },
      action,
      message: '当前设备不支持访问此内容',
    }
  }

  /**
   * 记录访问日志
   */
  private logAccess(context: ContentAccessContext): void {
    const logKey = `${context.userId}_${context.contentId}`

    if (!this.accessLog.has(logKey)) {
      this.accessLog.set(logKey, [])
    }

    const logs = this.accessLog.get(logKey)!
    logs.push({
      timestamp: context.timestamp,
      role: context.role,
      contentId: context.contentId,
      userAgent: context.userAgent,
    })

    // 限制日志数量
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100)
    }
  }

  /**
   * 获取访问日志
   */
  getAccessLog(userId: string | number, contentId?: string): ContentAccessLog[] {
    if (contentId) {
      const logKey = `${userId}_${contentId}`
      return this.accessLog.get(logKey) || []
    }

    // 返回用户的所有访问日志
    const allLogs: ContentAccessLog[] = []
    for (const [key, logs] of this.accessLog) {
      if (key.startsWith(`${userId}_`)) {
        allLogs.push(...logs)
      }
    }

    return allLogs.sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * 清除访问日志
   */
  clearAccessLog(userId?: string | number): void {
    if (userId) {
      const keysToDelete = Array.from(this.accessLog.keys()).filter(key => key.startsWith(`${userId}_`))
      keysToDelete.forEach(key => this.accessLog.delete(key))
    } else {
      this.accessLog.clear()
    }
  }
}

// ==================== 访问日志接口 ====================

/**
 * 内容访问日志
 */
interface ContentAccessLog {
  timestamp: number
  role: UserRole
  contentId: string
  userAgent?: string
}
