/**
 * 角色切换服务测试用例
 * @description 测试角色切换服务的核心功能
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import type {
  IRoleSwitchObserver,
  UserRole,
  UserRoleInfo,
} from '../types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RoleSwitchService } from '../core/RoleSwitchService'

// ==================== 测试数据准备 ====================

const mockUserRoleInfo: UserRoleInfo = {
  userId: 'test-user-123',
  currentRole: {
    id: 'role-regular',
    type: UserRole.REGULAR,
    name: '普通用户',
    permissions: [],
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
    {
      id: 'role-institutional',
      type: UserRole.INSTITUTIONAL,
      name: '机构用户',
      permissions: [],
      status: 'pending',
    },
  ],
  lastUpdated: Date.now(),
}

// ==================== 模拟观察者 ====================

class MockRoleSwitchObserver implements IRoleSwitchObserver {
  public onPreSwitchCalled = false
  public onPostSwitchCalled = false
  public onSwitchFailedCalled = false
  public lastFromRole?: UserRole
  public lastToRole?: UserRole
  public lastError?: Error

  async onPreSwitch(fromRole: UserRole, toRole: UserRole): Promise<boolean> {
    this.onPreSwitchCalled = true
    this.lastFromRole = fromRole
    this.lastToRole = toRole
    return true
  }

  async onPostSwitch(fromRole: UserRole, toRole: UserRole, success: boolean): Promise<void> {
    this.onPostSwitchCalled = true
    this.lastFromRole = fromRole
    this.lastToRole = toRole
  }

  async onSwitchFailed(fromRole: UserRole, toRole: UserRole, error: Error): Promise<void> {
    this.onSwitchFailedCalled = true
    this.lastFromRole = fromRole
    this.lastToRole = toRole
    this.lastError = error
  }

  reset(): void {
    this.onPreSwitchCalled = false
    this.onPostSwitchCalled = false
    this.onSwitchFailedCalled = false
    this.lastFromRole = undefined
    this.lastToRole = undefined
    this.lastError = undefined
  }
}

// ==================== 测试套件 ====================

describe('roleSwitchService', () => {
  let roleSwitchService: RoleSwitchService
  let mockObserver: MockRoleSwitchObserver

  beforeEach(() => {
    roleSwitchService = new RoleSwitchService()
    mockObserver = new MockRoleSwitchObserver()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ==================== 初始化测试 ====================

  describe('初始化', () => {
    it('应该正确初始化角色切换服务', () => {
      expect(roleSwitchService).toBeDefined()
      expect(roleSwitchService.canSwitchRole).toBe(true)
      expect(roleSwitchService.isProcessing).toBe(false)
    })

    it('应该正确设置用户角色信息', () => {
      roleSwitchService.setUserRoleInfo(mockUserRoleInfo)

      expect(roleSwitchService.getCurrentRole()).toBe(UserRole.REGULAR)
      expect(roleSwitchService.getAvailableRoles()).toHaveLength(3)
    })
  })

  // ==================== 观察者模式测试 ====================

  describe('观察者模式', () => {
    beforeEach(() => {
      roleSwitchService.setUserRoleInfo(mockUserRoleInfo)
    })

    it('应该正确添加观察者', () => {
      roleSwitchService.addObserver(mockObserver)

      // 通过内部状态验证观察者已添加
      expect(roleSwitchService.observers).toContain(mockObserver)
    })

    it('应该正确移除观察者', () => {
      roleSwitchService.addObserver(mockObserver)
      roleSwitchService.removeObserver(mockObserver)

      expect(roleSwitchService.observers).not.toContain(mockObserver)
    })

    it('应该在角色切换时通知观察者', async () => {
      roleSwitchService.addObserver(mockObserver)

      const result = await roleSwitchService.switchRole(UserRole.CHANNEL, '测试切换')

      expect(result).toBe(true)
      expect(mockObserver.onPreSwitchCalled).toBe(true)
      expect(mockObserver.onPostSwitchCalled).toBe(true)
      expect(mockObserver.lastFromRole).toBe(UserRole.REGULAR)
      expect(mockObserver.lastToRole).toBe(UserRole.CHANNEL)
    })

    it('应该在切换失败时通知观察者', async () => {
      roleSwitchService.addObserver(mockObserver)

      // 尝试切换到不可用角色
      const result = await roleSwitchService.switchRole(UserRole.ADMIN, '测试失败')

      expect(result).toBe(false)
      expect(mockObserver.onSwitchFailedCalled).toBe(true)
    })
  })

  // ==================== 角色切换测试 ====================

  describe('角色切换', () => {
    beforeEach(() => {
      roleSwitchService.setUserRoleInfo(mockUserRoleInfo)
    })

    it('应该成功切换到可用的激活角色', async () => {
      const result = await roleSwitchService.switchRole(UserRole.CHANNEL, '业务需要')

      expect(result).toBe(true)
      expect(roleSwitchService.getCurrentRole()).toBe(UserRole.CHANNEL)
    })

    it('应该拒绝切换到不可用角色', async () => {
      const result = await roleSwitchService.switchRole(UserRole.ADMIN, '测试')

      expect(result).toBe(false)
      expect(roleSwitchService.getCurrentRole()).toBe(UserRole.REGULAR)
    })

    it('应该拒绝切换到待审核状态的角色', async () => {
      const result = await roleSwitchService.switchRole(UserRole.INSTITUTIONAL, '测试')

      expect(result).toBe(false)
      expect(roleSwitchService.getCurrentRole()).toBe(UserRole.REGULAR)
    })

    it('应该拒绝切换到当前角色', async () => {
      const result = await roleSwitchService.switchRole(UserRole.REGULAR, '测试')

      expect(result).toBe(false)
      expect(roleSwitchService.getCurrentRole()).toBe(UserRole.REGULAR)
    })

    it('应该正确记录角色切换历史', async () => {
      await roleSwitchService.switchRole(UserRole.CHANNEL, '业务需要')

      const history = await roleSwitchService.getRoleSwitchHistory('test-user-123', 10)

      expect(history).toHaveLength(1)
      expect(history[0].fromRole).toBe(UserRole.REGULAR)
      expect(history[0].toRole).toBe(UserRole.CHANNEL)
      expect(history[0].reason).toBe('业务需要')
      expect(history[0].success).toBe(true)
    })
  })

  // ==================== 并发控制测试 ====================

  describe('并发控制', () => {
    beforeEach(() => {
      roleSwitchService.setUserRoleInfo(mockUserRoleInfo)
    })

    it('应该防止并发角色切换', async () => {
      // 模拟慢速切换
      const slowSwitchPromise = roleSwitchService.switchRole(UserRole.CHANNEL, '慢速切换')

      // 立即尝试另一个切换
      const fastSwitchPromise = roleSwitchService.switchRole(UserRole.CHANNEL, '快速切换')

      const [slowResult, fastResult] = await Promise.all([slowSwitchPromise, fastSwitchPromise])

      // 只有一个应该成功
      expect(slowResult !== fastResult).toBe(true)
      expect(roleSwitchService.isProcessing).toBe(false)
    })

    it('应该正确处理切换队列', async () => {
      const promises = [
        roleSwitchService.switchRole(UserRole.CHANNEL, '切换1'),
        roleSwitchService.switchRole(UserRole.REGULAR, '切换2'),
        roleSwitchService.switchRole(UserRole.CHANNEL, '切换3'),
      ]

      const results = await Promise.all(promises)

      // 应该有序处理，但可能有些被拒绝
      expect(results.includes(true)).toBe(true)
      expect(roleSwitchService.isProcessing).toBe(false)
    })
  })

  // ==================== 权限验证测试 ====================

  describe('权限验证', () => {
    beforeEach(() => {
      roleSwitchService.setUserRoleInfo(mockUserRoleInfo)
    })

    it('应该正确验证角色切换权限', () => {
      expect(roleSwitchService.canSwitchToRole(UserRole.CHANNEL)).toBe(true)
      expect(roleSwitchService.canSwitchToRole(UserRole.INSTITUTIONAL)).toBe(false)
      expect(roleSwitchService.canSwitchToRole(UserRole.ADMIN)).toBe(false)
    })

    it('应该在禁用切换时拒绝所有切换', async () => {
      roleSwitchService.setCanSwitchRole(false)

      const result = await roleSwitchService.switchRole(UserRole.CHANNEL, '测试')

      expect(result).toBe(false)
      expect(roleSwitchService.getCurrentRole()).toBe(UserRole.REGULAR)
    })

    it('应该正确恢复切换能力', async () => {
      roleSwitchService.setCanSwitchRole(false)
      roleSwitchService.setCanSwitchRole(true)

      const result = await roleSwitchService.switchRole(UserRole.CHANNEL, '测试')

      expect(result).toBe(true)
      expect(roleSwitchService.getCurrentRole()).toBe(UserRole.CHANNEL)
    })
  })

  // ==================== 错误处理测试 ====================

  describe('错误处理', () => {
    it('应该正确处理未设置用户信息的情况', async () => {
      const result = await roleSwitchService.switchRole(UserRole.CHANNEL, '测试')

      expect(result).toBe(false)
    })

    it('应该正确处理观察者异常', async () => {
      roleSwitchService.setUserRoleInfo(mockUserRoleInfo)

      // 创建会抛出异常的观察者
      const errorObserver: IRoleSwitchObserver = {
        async onPreSwitch() {
          throw new Error('观察者错误')
        },
        async onPostSwitch() {},
        async onSwitchFailed() {},
      }

      roleSwitchService.addObserver(errorObserver)

      // 切换应该仍然成功，不受观察者错误影响
      const result = await roleSwitchService.switchRole(UserRole.CHANNEL, '测试')

      expect(result).toBe(true)
    })

    it('应该正确处理无效角色参数', async () => {
      roleSwitchService.setUserRoleInfo(mockUserRoleInfo)

      const result = await roleSwitchService.switchRole('' as any, '测试')

      expect(result).toBe(false)
    })
  })

  // ==================== 历史记录测试 ====================

  describe('历史记录', () => {
    beforeEach(() => {
      roleSwitchService.setUserRoleInfo(mockUserRoleInfo)
    })

    it('应该正确限制历史记录数量', async () => {
      // 执行多次切换
      for (let i = 0; i < 15; i++) {
        const targetRole = i % 2 === 0 ? UserRole.CHANNEL : UserRole.REGULAR
        await roleSwitchService.switchRole(targetRole, `切换${i}`)
      }

      const history = await roleSwitchService.getRoleSwitchHistory('test-user-123', 10)

      expect(history.length).toBeLessThanOrEqual(10)
    })

    it('应该按时间倒序返回历史记录', async () => {
      await roleSwitchService.switchRole(UserRole.CHANNEL, '第一次切换')
      await new Promise(resolve => setTimeout(resolve, 10)) // 确保时间差
      await roleSwitchService.switchRole(UserRole.REGULAR, '第二次切换')

      const history = await roleSwitchService.getRoleSwitchHistory('test-user-123', 10)

      expect(history).toHaveLength(2)
      expect(history[0].switchTime).toBeGreaterThan(history[1].switchTime)
      expect(history[0].reason).toBe('第二次切换')
    })

    it('应该正确记录失败的切换尝试', async () => {
      await roleSwitchService.switchRole(UserRole.ADMIN, '失败的切换')

      const history = await roleSwitchService.getRoleSwitchHistory('test-user-123', 10)

      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(false)
      expect(history[0].toRole).toBe(UserRole.ADMIN)
    })
  })

  // ==================== 性能测试 ====================

  describe('性能', () => {
    beforeEach(() => {
      roleSwitchService.setUserRoleInfo(mockUserRoleInfo)
    })

    it('应该在合理时间内完成角色切换', async () => {
      const startTime = Date.now()

      await roleSwitchService.switchRole(UserRole.CHANNEL, '性能测试')

      const duration = Date.now() - startTime

      // 角色切换应该在100ms内完成
      expect(duration).toBeLessThan(100)
    })

    it('应该高效处理大量观察者', async () => {
      // 添加多个观察者
      for (let i = 0; i < 50; i++) {
        roleSwitchService.addObserver(new MockRoleSwitchObserver())
      }

      const startTime = Date.now()

      await roleSwitchService.switchRole(UserRole.CHANNEL, '大量观察者测试')

      const duration = Date.now() - startTime

      // 即使有大量观察者，切换也应该在合理时间内完成
      expect(duration).toBeLessThan(500)
    })
  })
})
