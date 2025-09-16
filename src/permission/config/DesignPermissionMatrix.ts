/**
 * 设计文档权限矩阵配置
 * @description 基于 docs/base/role-visibility-range.csv 的权限配置
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import { AccessControlAction, UserRole } from '../types'
import type { ContentAccessConfig } from '../types'

// ==================== 设计文档权限矩阵 ====================

/**
 * 基于设计文档的内容可见性配置
 * 对应 role-visibility-range.csv 中的权限矩阵
 */
export const DESIGN_PERMISSION_MATRIX = {
  /**
   * 全部可见/游客可见
   * 所有角色都可以访问的内容
   */
  GUEST_VISIBLE: {
    [UserRole.GUEST]: AccessControlAction.UNRESTRICTED_ACCESS,
    [UserRole.REGULAR]: AccessControlAction.UNRESTRICTED_ACCESS,
    [UserRole.CHANNEL]: AccessControlAction.UNRESTRICTED_ACCESS,
    [UserRole.INSTITUTIONAL]: AccessControlAction.UNRESTRICTED_ACCESS,
    [UserRole.ADMIN]: AccessControlAction.UNRESTRICTED_ACCESS,
  },

  /**
   * 仅渠道可见
   * 只有渠道经理可以访问的内容
   */
  CHANNEL_ONLY: {
    [UserRole.GUEST]: AccessControlAction.COMPLETE_RESTRICTION,
    [UserRole.REGULAR]: AccessControlAction.COMPLETE_RESTRICTION,
    [UserRole.CHANNEL]: AccessControlAction.UNRESTRICTED_ACCESS,
    [UserRole.INSTITUTIONAL]: AccessControlAction.COMPLETE_RESTRICTION,
    [UserRole.ADMIN]: AccessControlAction.UNRESTRICTED_ACCESS, // 管理员可访问所有内容
  },

  /**
   * 仅机构可见
   * 只有机构经理可以访问的内容
   */
  INSTITUTIONAL_ONLY: {
    [UserRole.GUEST]: AccessControlAction.COMPLETE_RESTRICTION,
    [UserRole.REGULAR]: AccessControlAction.COMPLETE_RESTRICTION,
    [UserRole.CHANNEL]: AccessControlAction.COMPLETE_RESTRICTION,
    [UserRole.INSTITUTIONAL]: AccessControlAction.UNRESTRICTED_ACCESS,
    [UserRole.ADMIN]: AccessControlAction.UNRESTRICTED_ACCESS, // 管理员可访问所有内容
  },

  /**
   * 普通客户可见
   * 普通客户及以上角色可以访问的内容
   */
  REGULAR_CUSTOMER_VISIBLE: {
    [UserRole.GUEST]: AccessControlAction.COMPLETE_RESTRICTION,
    [UserRole.REGULAR]: AccessControlAction.UNRESTRICTED_ACCESS,
    [UserRole.CHANNEL]: AccessControlAction.UNRESTRICTED_ACCESS,
    [UserRole.INSTITUTIONAL]: AccessControlAction.UNRESTRICTED_ACCESS,
    [UserRole.ADMIN]: AccessControlAction.UNRESTRICTED_ACCESS,
  },
} as const

// ==================== 内容类型映射 ====================

/**
 * 内容类型与权限矩阵的映射关系
 */
export const CONTENT_TYPE_PERMISSION_MAP = {
  // 公开内容
  public_content: DESIGN_PERMISSION_MATRIX.GUEST_VISIBLE,
  announcement: DESIGN_PERMISSION_MATRIX.GUEST_VISIBLE,
  help_document: DESIGN_PERMISSION_MATRIX.GUEST_VISIBLE,

  // 用户专属内容
  user_profile: DESIGN_PERMISSION_MATRIX.REGULAR_CUSTOMER_VISIBLE,
  investment_record: DESIGN_PERMISSION_MATRIX.REGULAR_CUSTOMER_VISIBLE,
  personal_report: DESIGN_PERMISSION_MATRIX.REGULAR_CUSTOMER_VISIBLE,

  // 渠道专属内容
  channel_data: DESIGN_PERMISSION_MATRIX.CHANNEL_ONLY,
  commission_report: DESIGN_PERMISSION_MATRIX.CHANNEL_ONLY,
  sales_tools: DESIGN_PERMISSION_MATRIX.CHANNEL_ONLY,
  customer_management: DESIGN_PERMISSION_MATRIX.CHANNEL_ONLY,

  // 机构专属内容
  institutional_data: DESIGN_PERMISSION_MATRIX.INSTITUTIONAL_ONLY,
  institutional_report: DESIGN_PERMISSION_MATRIX.INSTITUTIONAL_ONLY,
  risk_management: DESIGN_PERMISSION_MATRIX.INSTITUTIONAL_ONLY,
  bulk_operations: DESIGN_PERMISSION_MATRIX.INSTITUTIONAL_ONLY,
} as const

// ==================== 权限配置生成器 ====================

/**
 * 根据内容类型生成权限配置
 * @param contentId 内容ID
 * @param contentType 内容类型
 * @returns 内容访问配置
 */
export function createContentAccessConfig(
  contentId: string,
  contentType: keyof typeof CONTENT_TYPE_PERMISSION_MAP
): ContentAccessConfig {
  const roleAccessRules = CONTENT_TYPE_PERMISSION_MAP[contentType]

  if (!roleAccessRules) {
    console.warn(`未知的内容类型: ${contentType}，使用默认权限配置`)
    return {
      contentId,
      contentType,
      roleAccessRules: DESIGN_PERMISSION_MATRIX.GUEST_VISIBLE,
      defaultAction: AccessControlAction.COMPLETE_RESTRICTION,
    }
  }

  return {
    contentId,
    contentType,
    roleAccessRules,
    defaultAction: AccessControlAction.COMPLETE_RESTRICTION,
  }
}

/**
 * 批量创建内容访问配置
 * @param contents 内容列表
 * @returns 内容访问配置映射
 */
export function createBatchContentAccessConfigs(
  contents: Array<{ id: string; type: keyof typeof CONTENT_TYPE_PERMISSION_MAP }>
): Record<string, ContentAccessConfig> {
  const configs: Record<string, ContentAccessConfig> = {}

  contents.forEach(content => {
    configs[content.id] = createContentAccessConfig(content.id, content.type)
  })

  return configs
}

// ==================== 权限检查辅助函数 ====================

/**
 * 检查角色是否可以访问指定内容类型
 * @param role 用户角色
 * @param contentType 内容类型
 * @returns 访问控制动作
 */
export function checkRoleContentAccess(
  role: UserRole,
  contentType: keyof typeof CONTENT_TYPE_PERMISSION_MAP
): AccessControlAction {
  const roleAccessRules = CONTENT_TYPE_PERMISSION_MAP[contentType]

  if (!roleAccessRules) {
    return AccessControlAction.COMPLETE_RESTRICTION
  }

  return roleAccessRules[role] || AccessControlAction.COMPLETE_RESTRICTION
}

/**
 * 获取角色可访问的内容类型列表
 * @param role 用户角色
 * @returns 可访问的内容类型列表
 */
export function getAccessibleContentTypes(role: UserRole): string[] {
  const accessibleTypes: string[] = []

  Object.entries(CONTENT_TYPE_PERMISSION_MAP).forEach(([contentType, roleAccessRules]) => {
    const action = roleAccessRules[role]
    if (action === AccessControlAction.UNRESTRICTED_ACCESS) {
      accessibleTypes.push(contentType)
    }
  })

  return accessibleTypes
}

/**
 * 获取内容类型的访问统计
 * @param contentType 内容类型
 * @returns 访问统计信息
 */
export function getContentTypeAccessStats(
  contentType: keyof typeof CONTENT_TYPE_PERMISSION_MAP
): Record<UserRole, AccessControlAction> {
  return CONTENT_TYPE_PERMISSION_MAP[contentType] || {}
}

// ==================== 权限矩阵验证 ====================

/**
 * 验证权限矩阵的完整性
 * @returns 验证结果
 */
export function validatePermissionMatrix(): {
  isValid: boolean
  missingRoles: UserRole[]
  missingContentTypes: string[]
} {
  const allRoles = Object.values(UserRole)
  const missingRoles: UserRole[] = []
  const missingContentTypes: string[] = []

  // 检查每个内容类型是否为所有角色定义了权限
  Object.entries(CONTENT_TYPE_PERMISSION_MAP).forEach(([contentType, roleAccessRules]) => {
    allRoles.forEach(role => {
      if (!(role in roleAccessRules)) {
        missingRoles.push(role)
      }
    })
  })

  return {
    isValid: missingRoles.length === 0 && missingContentTypes.length === 0,
    missingRoles: [...new Set(missingRoles)],
    missingContentTypes,
  }
}

// ==================== 导出默认配置 ====================

/**
 * 默认的内容访问配置
 */
export const DEFAULT_CONTENT_ACCESS_CONFIGS = {
  // 公开页面
  home: createContentAccessConfig('home', 'public_content'),
  about: createContentAccessConfig('about', 'public_content'),
  help: createContentAccessConfig('help', 'help_document'),

  // 用户页面
  profile: createContentAccessConfig('profile', 'user_profile'),
  investment: createContentAccessConfig('investment', 'investment_record'),

  // 渠道页面
  channel_dashboard: createContentAccessConfig('channel_dashboard', 'channel_data'),
  commission: createContentAccessConfig('commission', 'commission_report'),

  // 机构页面
  institutional_dashboard: createContentAccessConfig('institutional_dashboard', 'institutional_data'),
  risk_control: createContentAccessConfig('risk_control', 'risk_management'),
}

/**
 * 获取默认权限配置
 * @param contentId 内容ID
 * @returns 默认权限配置或null
 */
export function getDefaultContentAccessConfig(contentId: string): ContentAccessConfig | null {
  return DEFAULT_CONTENT_ACCESS_CONFIGS[contentId as keyof typeof DEFAULT_CONTENT_ACCESS_CONFIGS] || null
}
