/**
 * 测试环境设置
 * @description 配置测试环境和模拟依赖
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import { vi } from 'vitest'

// ==================== 全局模拟 ====================

// 模拟uni-app API
global.uni = {
  // 存储API
  getStorageSync: vi.fn(),
  setStorageSync: vi.fn(),
  removeStorageSync: vi.fn(),
  getStorageInfoSync: vi.fn(() => ({ keys: [] })),

  // 导航API
  navigateTo: vi.fn(),
  redirectTo: vi.fn(),
  switchTab: vi.fn(),
  reLaunch: vi.fn(),
  navigateBack: vi.fn(),

  // 界面API
  showToast: vi.fn(),
  showModal: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),

  // 网络API
  request: vi.fn(),

  // 其他API
  getSystemInfoSync: vi.fn(() => ({
    platform: 'devtools',
    version: '1.0.0',
  })),
} as any

// 模拟console方法（避免测试输出过多日志）
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// ==================== 测试工具函数 ====================

/**
 * 创建模拟的用户角色信息
 */
export function createMockUserRoleInfo(overrides: any = {}) {
  return {
    userId: 'test-user-123',
    currentRole: {
      id: 'role-regular',
      type: 'regular',
      name: '普通用户',
      description: '普通用户角色',
      permissions: [],
      status: 'active',
    },
    availableRoles: [
      {
        id: 'role-regular',
        type: 'regular',
        name: '普通用户',
        permissions: [],
        status: 'active',
      },
    ],
    lastUpdated: Date.now(),
    ...overrides,
  }
}

/**
 * 创建模拟的权限信息
 */
export function createMockPermission(overrides: any = {}) {
  return {
    id: 'test-permission',
    name: '测试权限',
    description: '测试用权限',
    resourceType: 'page',
    resourceId: 'test-resource',
    actions: ['read'],
    ...overrides,
  }
}

/**
 * 创建模拟的角色信息
 */
export function createMockRole(overrides: any = {}) {
  return {
    id: 'test-role',
    type: 'regular',
    name: '测试角色',
    description: '测试用角色',
    permissions: [],
    status: 'active',
    ...overrides,
  }
}

/**
 * 等待异步操作完成
 */
export function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 模拟网络延迟
 */
export function mockNetworkDelay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ==================== 测试数据常量 ====================

export const TEST_USER_ID = 'test-user-123'
export const TEST_ROLE_ID = 'test-role-456'
export const TEST_PERMISSION_ID = 'test-permission-789'

export const MOCK_ROLES = {
  GUEST: 'guest',
  REGULAR: 'regular',
  CHANNEL: 'channel',
  INSTITUTIONAL: 'institutional',
  ADMIN: 'admin',
} as const

export const MOCK_PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ADMIN: 'admin',
} as const

export const MOCK_RESOURCE_TYPES = {
  PAGE: 'page',
  COMPONENT: 'component',
  API: 'api',
  DATA: 'data',
} as const

// ==================== 测试断言助手 ====================

/**
 * 断言权限检查结果
 */
export function expectPermissionResult(
  result: any,
  expected: {
    hasPermission: boolean
    action?: string
    message?: string
  }
) {
  expect(result).toBeDefined()
  expect(result.hasPermission).toBe(expected.hasPermission)

  if (expected.action) {
    expect(result.action).toBe(expected.action)
  }

  if (expected.message) {
    expect(result.message).toBe(expected.message)
  }
}

/**
 * 断言角色切换结果
 */
export function expectRoleSwitchResult(result: boolean, expected: boolean) {
  expect(result).toBe(expected)
}

/**
 * 断言存储操作
 */
export function expectStorageOperation(operation: 'get' | 'set' | 'remove', key?: string) {
  switch (operation) {
    case 'get':
      expect(uni.getStorageSync).toHaveBeenCalled()
      if (key) {
        expect(uni.getStorageSync).toHaveBeenCalledWith(key)
      }
      break
    case 'set':
      expect(uni.setStorageSync).toHaveBeenCalled()
      if (key) {
        expect(uni.setStorageSync).toHaveBeenCalledWith(key, expect.any(String))
      }
      break
    case 'remove':
      expect(uni.removeStorageSync).toHaveBeenCalled()
      if (key) {
        expect(uni.removeStorageSync).toHaveBeenCalledWith(key)
      }
      break
  }
}

// ==================== 性能测试助手 ====================

/**
 * 测量函数执行时间
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T> | T,
  description?: string
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now()
  const result = await fn()
  const duration = Date.now() - startTime

  if (description) {
    console.debug(`${description} 执行时间: ${duration}ms`)
  }

  return { result, duration }
}

/**
 * 断言执行时间
 */
export function expectExecutionTime(duration: number, maxDuration: number, operation?: string) {
  const message = operation ? `${operation} 执行时间` : '执行时间'
  expect(duration).toBeLessThan(maxDuration)
}

// ==================== 并发测试助手 ====================

/**
 * 并发执行多个操作
 */
export async function runConcurrently<T>(operations: (() => Promise<T>)[], description?: string): Promise<T[]> {
  if (description) {
    console.debug(`开始并发执行 ${operations.length} 个操作: ${description}`)
  }

  const startTime = Date.now()
  const results = await Promise.all(operations.map(op => op()))
  const duration = Date.now() - startTime

  if (description) {
    console.debug(`并发操作完成，耗时: ${duration}ms`)
  }

  return results
}

/**
 * 测试竞态条件
 */
export async function testRaceCondition<T>(operation: () => Promise<T>, concurrency: number = 10): Promise<T[]> {
  const operations = Array.from({ length: concurrency }, () => operation)
  return runConcurrently(operations, `竞态条件测试 (并发数: ${concurrency})`)
}

// ==================== 错误测试助手 ====================

/**
 * 断言抛出特定错误
 */
export async function expectToThrowError(fn: () => Promise<any> | any, expectedError?: string | RegExp | Error) {
  if (expectedError) {
    await expect(fn).rejects.toThrow(expectedError)
  } else {
    await expect(fn).rejects.toThrow()
  }
}

/**
 * 断言不抛出错误
 */
export async function expectNotToThrow(fn: () => Promise<any> | any) {
  await expect(fn).resolves.not.toThrow()
}

// ==================== 清理函数 ====================

/**
 * 重置所有模拟
 */
export function resetAllMocks() {
  vi.clearAllMocks()
  vi.resetAllMocks()
}

/**
 * 清理测试环境
 */
export function cleanupTestEnvironment() {
  resetAllMocks()

  // 清理可能的定时器
  vi.clearAllTimers()

  // 重置模拟的uni API
  if (global.uni) {
    Object.keys(global.uni).forEach(key => {
      if (typeof global.uni[key] === 'function') {
        vi.mocked(global.uni[key]).mockReset()
      }
    })
  }
}
