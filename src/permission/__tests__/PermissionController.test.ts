/**
 * 权限控制器测试用例
 * @description 测试权限控制器的核心功能
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import type { PermissionCacheManager } from '../cache/PermissionCacheManager'
import type { PermissionPerformanceMonitor } from '../performance/PermissionPerformanceMonitor'
import type {
  Permission,
  PermissionAction,
  PermissionContext,
  ResourceType,
  Role,
  UserRole,
  UserRoleInfo,
} from '../types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PermissionController } from '../core/PermissionController'

// ==================== 测试数据准备 ====================

const mockUserRoleInfo: UserRoleInfo = {
  userId: 'test-user-123',
  currentRole: {
    id: 'role-regular',
    type: UserRole.REGULAR,
    name: '普通用户',
    description: '普通用户角色',
    permissions: [
      {
        id: 'perm-1',
        name: '查看基础内容',
        resourceType: ResourceType.PAGE,
        resourceId: 'basic-content',
        actions: [PermissionAction.READ],
      },
      {
        id: 'perm-2',
        name: '编辑个人信息',
        resourceType: ResourceType.USER_DATA,
        resourceId: 'personal-info',
        actions: [PermissionAction.READ, PermissionAction.WRITE],
      },
    ],
    status: 'active',
  },
  availableRoles: [
    {
      id: 'role-regular',
      type: UserRole.REGULAR,
      name: '普通用户',
      permissions: [],
      status: 'active',
    },
    {
      id: 'role-channel',
      type: UserRole.CHANNEL,
      name: '渠道用户',
      permissions: [],
      status: 'active',
    },
  ],
  lastUpdated: Date.now(),
}

const mockChannelRole: Role = {
  id: 'role-channel',
  type: UserRole.CHANNEL,
  name: '渠道用户',
  description: '渠道用户角色',
  permissions: [
    {
      id: 'perm-3',
      name: '查看渠道数据',
      resourceType: ResourceType.FINANCIAL_DATA,
      resourceId: 'channel-data',
      actions: [PermissionAction.READ],
    },
    {
      id: 'perm-4',
      name: '管理渠道用户',
      resourceType: ResourceType.USER_MANAGEMENT,
      resourceId: 'channel-users',
      actions: [PermissionAction.READ, PermissionAction.WRITE],
    },
  ],
  status: 'active',
}

// ==================== 测试套件 ====================

describe('permissionController', () => {
  let permissionController: PermissionController
  let mockCacheManager: PermissionCacheManager
  let mockPerformanceMonitor: PermissionPerformanceMonitor

  beforeEach(() => {
    // 创建模拟的缓存管理器
    mockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      has: vi.fn(),
      getCachedPermissionResult: vi.fn(),
      cachePermissionResult: vi.fn(),
    } as any

    // 创建模拟的性能监控器
    mockPerformanceMonitor = {
      monitorAsync: vi.fn().mockImplementation(async (operation, fn) => await fn()),
      startOperation: vi.fn(),
      endOperation: vi.fn(),
    } as any

    // 创建权限控制器实例
    permissionController = new PermissionController({
      cacheManager: mockCacheManager,
      performanceMonitor: mockPerformanceMonitor,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ==================== 初始化测试 ====================

  describe('初始化', () => {
    it('应该正确初始化权限控制器', () => {
      expect(permissionController).toBeDefined()
      expect(permissionController.isInitialized).toBe(false)
    })

    it('应该正确初始化用户角色信息', async () => {
      await permissionController.initializeUserRole(mockUserRoleInfo)

      expect(permissionController.isInitialized).toBe(true)
      expect(permissionController.getCurrentRole()).toEqual(mockUserRoleInfo.currentRole)
      expect(permissionController.getCurrentUserId()).toBe(mockUserRoleInfo.userId)
    })
  })

  // ==================== 权限检查测试 ====================

  describe('权限检查', () => {
    beforeEach(async () => {
      await permissionController.initializeUserRole(mockUserRoleInfo)
    })

    it('应该正确检查用户拥有的权限', async () => {
      const result = await permissionController.hasPermission(
        PermissionAction.READ,
        ResourceType.PAGE,
        'basic-content',
      )

      expect(result).toBe(true)
    })

    it('应该正确拒绝用户没有的权限', async () => {
      const result = await permissionController.hasPermission(
        PermissionAction.DELETE,
        ResourceType.PAGE,
        'basic-content',
      )

      expect(result).toBe(false)
    })

    it('应该正确检查复合权限', async () => {
      const readResult = await permissionController.hasPermission(
        PermissionAction.READ,
        ResourceType.USER_DATA,
        'personal-info',
      )

      const writeResult = await permissionController.hasPermission(
        PermissionAction.WRITE,
        ResourceType.USER_DATA,
        'personal-info',
      )

      expect(readResult).toBe(true)
      expect(writeResult).toBe(true)
    })

    it('应该使用缓存提高性能', async () => {
      // 模拟缓存命中
      vi.mocked(mockCacheManager.getCachedPermissionResult).mockResolvedValue({
        hasPermission: true,
        action: 'unrestricted_access',
      })

      const result = await permissionController.hasPermission(
        PermissionAction.READ,
        ResourceType.PAGE,
        'cached-content',
      )

      expect(result).toBe(true)
      expect(mockCacheManager.getCachedPermissionResult).toHaveBeenCalled()
    })
  })

  // ==================== 角色切换测试 ====================

  describe('角色切换', () => {
    beforeEach(async () => {
      await permissionController.initializeUserRole(mockUserRoleInfo)
    })

    it('应该正确切换到可用角色', async () => {
      const result = await permissionController.switchRole(UserRole.CHANNEL, '业务需要')

      expect(result).toBe(true)
      expect(permissionController.getCurrentRole()?.type).toBe(UserRole.CHANNEL)
    })

    it('应该拒绝切换到不可用角色', async () => {
      const result = await permissionController.switchRole(UserRole.ADMIN, '测试')

      expect(result).toBe(false)
      expect(permissionController.getCurrentRole()?.type).toBe(UserRole.REGULAR)
    })

    it('应该在角色切换后清除相关缓存', async () => {
      await permissionController.switchRole(UserRole.CHANNEL, '业务需要')

      expect(mockCacheManager.delete).toHaveBeenCalled()
    })
  })

  // ==================== 批量权限检查测试 ====================

  describe('批量权限检查', () => {
    beforeEach(async () => {
      await permissionController.initializeUserRole(mockUserRoleInfo)
    })

    it('应该正确处理批量权限检查', async () => {
      const contexts: PermissionContext[] = [
        {
          userRole: mockUserRoleInfo,
          resource: {
            type: ResourceType.PAGE,
            id: 'basic-content',
          },
          action: PermissionAction.READ,
        },
        {
          userRole: mockUserRoleInfo,
          resource: {
            type: ResourceType.USER_DATA,
            id: 'personal-info',
          },
          action: PermissionAction.WRITE,
        },
      ]

      const results = await permissionController.batchCheckPermissions(contexts)

      expect(results).toHaveLength(2)
      expect(results[0].hasPermission).toBe(true)
      expect(results[1].hasPermission).toBe(true)
    })

    it('应该正确处理部分失败的批量检查', async () => {
      const contexts: PermissionContext[] = [
        {
          userRole: mockUserRoleInfo,
          resource: {
            type: ResourceType.PAGE,
            id: 'basic-content',
          },
          action: PermissionAction.READ,
        },
        {
          userRole: mockUserRoleInfo,
          resource: {
            type: ResourceType.ADMIN_PANEL,
            id: 'admin-settings',
          },
          action: PermissionAction.READ,
        },
      ]

      const results = await permissionController.batchCheckPermissions(contexts)

      expect(results).toHaveLength(2)
      expect(results[0].hasPermission).toBe(true)
      expect(results[1].hasPermission).toBe(false)
    })
  })

  // ==================== 错误处理测试 ====================

  describe('错误处理', () => {
    it('应该正确处理未初始化的情况', async () => {
      const result = await permissionController.hasPermission(
        PermissionAction.READ,
        ResourceType.PAGE,
        'test',
      )

      expect(result).toBe(false)
    })

    it('应该正确处理无效的权限参数', async () => {
      await permissionController.initializeUserRole(mockUserRoleInfo)

      const result = await permissionController.hasPermission(
        '' as any,
        '' as any,
        '',
      )

      expect(result).toBe(false)
    })

    it('应该正确处理缓存错误', async () => {
      await permissionController.initializeUserRole(mockUserRoleInfo)

      // 模拟缓存错误
      vi.mocked(mockCacheManager.getCachedPermissionResult).mockRejectedValue(
        new Error('缓存错误'),
      )

      const result = await permissionController.hasPermission(
        PermissionAction.READ,
        ResourceType.PAGE,
        'test-content',
      )

      // 应该降级到直接检查，而不是失败
      expect(result).toBeDefined()
    })
  })

  // ==================== 性能测试 ====================

  describe('性能', () => {
    beforeEach(async () => {
      await permissionController.initializeUserRole(mockUserRoleInfo)
    })

    it('应该在指定时间内完成权限检查', async () => {
      const startTime = Date.now()

      await permissionController.hasPermission(
        PermissionAction.READ,
        ResourceType.PAGE,
        'basic-content',
      )

      const duration = Date.now() - startTime

      // 权限检查应该在50ms内完成
      expect(duration).toBeLessThan(50)
    })

    it('应该正确使用性能监控', async () => {
      await permissionController.hasPermission(
        PermissionAction.READ,
        ResourceType.PAGE,
        'basic-content',
      )

      expect(mockPerformanceMonitor.monitorAsync).toHaveBeenCalled()
    })

    it('批量权限检查应该比单独检查更高效', async () => {
      const contexts: PermissionContext[] = Array.from({ length: 10 }, (_, i) => ({
        userRole: mockUserRoleInfo,
        resource: {
          type: ResourceType.PAGE,
          id: `content-${i}`,
        },
        action: PermissionAction.READ,
      }))

      // 批量检查
      const batchStartTime = Date.now()
      await permissionController.batchCheckPermissions(contexts)
      const batchDuration = Date.now() - batchStartTime

      // 单独检查
      const individualStartTime = Date.now()
      for (const context of contexts) {
        await permissionController.hasPermission(
          context.action,
          context.resource.type,
          context.resource.id,
        )
      }
      const individualDuration = Date.now() - individualStartTime

      // 批量检查应该更快
      expect(batchDuration).toBeLessThan(individualDuration)
    })
  })

  // ==================== 边界条件测试 ====================

  describe('边界条件', () => {
    it('应该正确处理空权限列表', async () => {
      const emptyRoleInfo: UserRoleInfo = {
        ...mockUserRoleInfo,
        currentRole: {
          ...mockUserRoleInfo.currentRole,
          permissions: [],
        },
      }

      await permissionController.initializeUserRole(emptyRoleInfo)

      const result = await permissionController.hasPermission(
        PermissionAction.READ,
        ResourceType.PAGE,
        'any-content',
      )

      expect(result).toBe(false)
    })

    it('应该正确处理大量权限', async () => {
      const manyPermissions: Permission[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `perm-${i}`,
        name: `权限${i}`,
        resourceType: ResourceType.PAGE,
        resourceId: `content-${i}`,
        actions: [PermissionAction.READ],
      }))

      const largeRoleInfo: UserRoleInfo = {
        ...mockUserRoleInfo,
        currentRole: {
          ...mockUserRoleInfo.currentRole,
          permissions: manyPermissions,
        },
      }

      await permissionController.initializeUserRole(largeRoleInfo)

      const result = await permissionController.hasPermission(
        PermissionAction.READ,
        ResourceType.PAGE,
        'content-500',
      )

      expect(result).toBe(true)
    })

    it('应该正确处理并发权限检查', async () => {
      await permissionController.initializeUserRole(mockUserRoleInfo)

      const promises = Array.from({ length: 100 }, () =>
        permissionController.hasPermission(
          PermissionAction.READ,
          ResourceType.PAGE,
          'basic-content',
        ))

      const results = await Promise.all(promises)

      // 所有结果应该一致
      expect(results.every(result => result === true)).toBe(true)
    })
  })
})
