/**
 * 权限相关API接口
 * @description 权限管理系统的API接口定义
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import type {
  ContentAccessConfig,
  Permission,
  Role,
  RoleSwitchRecord,
  UserRole,
  UserRoleInfo,
} from '@/permission/types'
import { http } from '@/http/http'

// ==================== 请求参数类型定义 ====================

/**
 * 角色切换请求参数
 */
export interface RoleSwitchRequest {
  targetRole: UserRole
  reason?: string
}

/**
 * 权限验证请求参数
 */
export interface PermissionValidationRequest {
  userId: string | number
  currentRole: UserRole
  resource?: {
    type: string
    id: string
    metadata?: Record<string, any>
  }
  action?: string
  extra?: Record<string, any>
}

/**
 * 批量权限验证请求参数
 */
export interface BatchPermissionValidationRequest {
  contexts: PermissionValidationRequest[]
}

/**
 * 角色申请请求参数
 */
export interface RoleApplicationRequest {
  targetRole: UserRole
  reason: string
  supportingDocuments?: string[]
}

// ==================== 响应类型定义 ====================

/**
 * 角色切换响应
 */
export interface RoleSwitchResponse {
  success: boolean
  message?: string
  newRole?: Role
  switchRecord?: RoleSwitchRecord
}

/**
 * 权限验证响应
 */
export interface PermissionValidationResponse {
  hasPermission: boolean
  action: string
  message?: string
  redirectUrl?: string
  metadata?: Record<string, any>
}

/**
 * 角色申请响应
 */
export interface RoleApplicationResponse {
  success: boolean
  applicationId: string
  status: 'pending' | 'approved' | 'rejected'
  message?: string
  estimatedProcessTime?: number
}

// ==================== 用户角色相关API ====================

/**
 * 获取用户角色信息
 * @param userId 用户ID
 * @returns 用户角色信息
 */
export function getUserRoles(userId: string | number) {
  return http.get<UserRoleInfo>(`/permission/users/${userId}/roles`)
}

/**
 * 获取当前用户角色信息
 * @returns 当前用户角色信息
 */
export function getCurrentUserRoles() {
  return http.get<UserRoleInfo>('/permission/users/current/roles')
}

/**
 * 切换用户角色
 * @param userId 用户ID
 * @param request 角色切换请求参数
 * @returns 角色切换结果
 */
export function switchUserRole(userId: string | number, request: RoleSwitchRequest) {
  return http.post<RoleSwitchResponse>(`/permission/users/${userId}/role-switch`, request)
}

/**
 * 切换当前用户角色
 * @param request 角色切换请求参数
 * @returns 角色切换结果
 */
export function switchCurrentUserRole(request: RoleSwitchRequest) {
  return http.post<RoleSwitchResponse>('/permission/users/current/role-switch', request)
}

/**
 * 获取用户角色切换历史
 * @param userId 用户ID
 * @param limit 限制数量
 * @returns 角色切换历史
 */
export function getUserRoleSwitchHistory(userId: string | number, limit: number = 20) {
  return http.get<RoleSwitchRecord[]>(`/permission/users/${userId}/role-switch-history`, { limit })
}

/**
 * 申请新角色
 * @param request 角色申请请求参数
 * @returns 申请结果
 */
export function applyForRole(request: RoleApplicationRequest) {
  return http.post<RoleApplicationResponse>('/permission/users/current/role-application', request)
}

// ==================== 角色权限相关API ====================

/**
 * 获取角色权限列表
 * @param role 角色类型
 * @returns 权限列表
 */
export function getRolePermissions(role: UserRole) {
  return http.get<Permission[]>(`/permission/roles/${role}/permissions`)
}

/**
 * 获取所有角色列表
 * @returns 角色列表
 */
export function getAllRoles() {
  return http.get<Role[]>('/permission/roles')
}

/**
 * 获取角色详细信息
 * @param roleId 角色ID
 * @returns 角色详细信息
 */
export function getRoleDetails(roleId: string) {
  return http.get<Role>(`/permission/roles/${roleId}`)
}

// ==================== 权限验证相关API ====================

/**
 * 验证权限
 * @param request 权限验证请求参数
 * @returns 权限验证结果
 */
export function validatePermission(request: PermissionValidationRequest) {
  return http.post<PermissionValidationResponse>('/permission/validate', request)
}

/**
 * 批量验证权限
 * @param request 批量权限验证请求参数
 * @returns 权限验证结果列表
 */
export function batchValidatePermissions(request: BatchPermissionValidationRequest) {
  return http.post<PermissionValidationResponse[]>('/permission/batch-validate', request)
}

/**
 * 检查用户是否有指定权限
 * @param action 操作类型
 * @param resourceType 资源类型
 * @param resourceId 资源ID
 * @returns 是否有权限
 */
export function checkUserPermission(action: string, resourceType: string, resourceId: string) {
  return http.get<{ hasPermission: boolean }>('/permission/check', {
    action,
    resourceType,
    resourceId,
  })
}

// ==================== 内容访问控制相关API ====================

/**
 * 获取内容访问规则
 * @param contentId 内容ID
 * @returns 内容访问规则
 */
export function getContentAccessRules(contentId: string) {
  return http.get<ContentAccessConfig>(`/permission/content/${contentId}/access-rules`)
}

/**
 * 检查内容访问权限
 * @param contentId 内容ID
 * @param context 额外上下文
 * @returns 访问控制动作
 */
export function checkContentAccess(contentId: string, context?: Record<string, any>) {
  return http.post<{ action: string, message?: string }>(`/permission/content/${contentId}/check-access`, {
    context,
  })
}

/**
 * 批量检查内容访问权限
 * @param contentIds 内容ID列表
 * @returns 访问控制动作映射
 */
export function batchCheckContentAccess(contentIds: string[]) {
  return http.post<Record<string, string>>('/permission/content/batch-check-access', {
    contentIds,
  })
}

// ==================== 权限配置相关API ====================

/**
 * 获取权限系统配置
 * @returns 权限系统配置
 */
export function getPermissionConfig() {
  return http.get<any>('/permission/config')
}

/**
 * 同步用户权限状态
 * @param userId 用户ID
 * @param roleInfo 角色信息
 * @returns 同步结果
 */
export function syncUserPermissionState(userId: string | number, roleInfo: UserRoleInfo) {
  return http.post<{ success: boolean }>(`/permission/users/${userId}/sync-state`, {
    currentRole: roleInfo.currentRole.type,
    lastUpdated: roleInfo.lastUpdated,
  })
}

/**
 * 刷新用户权限缓存
 * @param userId 用户ID
 * @returns 刷新结果
 */
export function refreshUserPermissionCache(userId: string | number) {
  return http.post<{ success: boolean }>(`/permission/users/${userId}/refresh-cache`)
}

// ==================== 权限审计相关API ====================

/**
 * 获取用户权限操作日志
 * @param userId 用户ID
 * @param limit 限制数量
 * @returns 操作日志
 */
export function getUserPermissionLogs(userId: string | number, limit: number = 50) {
  return http.get<any[]>(`/permission/users/${userId}/logs`, { limit })
}

/**
 * 记录权限操作
 * @param operation 操作类型
 * @param details 操作详情
 * @returns 记录结果
 */
export function logPermissionOperation(operation: string, details: Record<string, any>) {
  return http.post<{ success: boolean }>('/permission/logs', {
    operation,
    details,
    timestamp: Date.now(),
  })
}

// ==================== 管理员相关API ====================

/**
 * 获取所有用户的角色信息（管理员权限）
 * @param page 页码
 * @param pageSize 页面大小
 * @returns 用户角色信息列表
 */
export function getAllUsersRoles(page: number = 1, pageSize: number = 20) {
  return http.get<{
    users: UserRoleInfo[]
    total: number
    page: number
    pageSize: number
  }>('/permission/admin/users/roles', { page, pageSize })
}

/**
 * 强制切换用户角色（管理员权限）
 * @param userId 用户ID
 * @param targetRole 目标角色
 * @param reason 操作原因
 * @returns 操作结果
 */
export function forceUserRoleSwitch(userId: string | number, targetRole: UserRole, reason: string) {
  return http.post<RoleSwitchResponse>(`/permission/admin/users/${userId}/force-role-switch`, {
    targetRole,
    reason,
  })
}

/**
 * 审批角色申请（管理员权限）
 * @param applicationId 申请ID
 * @param approved 是否批准
 * @param reason 审批原因
 * @returns 审批结果
 */
export function approveRoleApplication(applicationId: string, approved: boolean, reason?: string) {
  return http.post<{ success: boolean }>(`/permission/admin/role-applications/${applicationId}/approve`, {
    approved,
    reason,
  })
}

/**
 * 获取待审批的角色申请列表（管理员权限）
 * @returns 待审批申请列表
 */
export function getPendingRoleApplications() {
  return http.get<RoleApplicationResponse[]>('/permission/admin/role-applications/pending')
}
