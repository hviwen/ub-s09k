/**
 * 权限指令集合 - Vue自定义指令
 * @description 提供v-permission、v-role等权限控制指令
 * @author unibest权限管理系统
 * @version 1.0.0
 */

import type { App, DirectiveBinding } from 'vue'
import type { PermissionAction, ResourceType, UserRole } from '../types'
import { usePermissionStore } from '../store/permissionStore'

// ==================== 指令参数类型定义 ====================

/**
 * 权限指令参数
 */
interface PermissionDirectiveValue {
  /** 需要的角色 */
  roles?: UserRole[]
  /** 需要的权限操作 */
  action?: PermissionAction
  /** 资源类型 */
  resourceType?: ResourceType
  /** 资源ID */
  resourceId?: string
  /** 无权限时的处理方式 */
  fallback?: 'hide' | 'disable' | 'placeholder'
  /** 占位符内容 */
  placeholder?: string
  /** 自定义检查函数 */
  checker?: (role: UserRole) => boolean
}

/**
 * 角色指令参数
 */
interface RoleDirectiveValue {
  /** 需要的角色 */
  roles: UserRole | UserRole[]
  /** 匹配模式 */
  mode?: 'any' | 'all'
  /** 无权限时的处理方式 */
  fallback?: 'hide' | 'disable' | 'placeholder'
  /** 占位符内容 */
  placeholder?: string
}

// ==================== 工具函数 ====================

/**
 * 获取权限Store实例
 */
function getPermissionStore() {
  try {
    return usePermissionStore()
  } catch (error) {
    console.warn('权限Store未初始化，权限指令将不生效')
    return null
  }
}

/**
 * 创建占位符元素
 */
function createPlaceholder(content: string): HTMLElement {
  const placeholder = document.createElement('div')
  placeholder.className = 'permission-placeholder'
  placeholder.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    color: #999;
    font-size: 14px;
    background-color: #f8f9fa;
    border: 2px dashed #dee2e6;
    border-radius: 8px;
    text-align: center;
  `
  placeholder.textContent = content
  return placeholder
}

/**
 * 隐藏元素
 */
function hideElement(el: HTMLElement): void {
  el.style.display = 'none'
  el.setAttribute('data-permission-hidden', 'true')
}

/**
 * 显示元素
 */
function showElement(el: HTMLElement): void {
  if (el.getAttribute('data-permission-hidden') === 'true') {
    el.style.display = ''
    el.removeAttribute('data-permission-hidden')
  }
}

/**
 * 禁用元素
 */
function disableElement(el: HTMLElement): void {
  el.style.opacity = '0.5'
  el.style.pointerEvents = 'none'
  el.style.cursor = 'not-allowed'
  el.setAttribute('data-permission-disabled', 'true')

  // 如果是表单元素，设置disabled属性
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLButtonElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement
  ) {
    el.disabled = true
  }
}

/**
 * 启用元素
 */
function enableElement(el: HTMLElement): void {
  if (el.getAttribute('data-permission-disabled') === 'true') {
    el.style.opacity = ''
    el.style.pointerEvents = ''
    el.style.cursor = ''
    el.removeAttribute('data-permission-disabled')

    // 如果是表单元素，移除disabled属性
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLButtonElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement
    ) {
      el.disabled = false
    }
  }
}

/**
 * 替换为占位符
 */
function replaceWithPlaceholder(el: HTMLElement, content: string): void {
  const placeholder = createPlaceholder(content)
  el.style.display = 'none'
  el.parentNode?.insertBefore(placeholder, el.nextSibling)
  el.setAttribute('data-permission-placeholder', 'true')
}

/**
 * 移除占位符
 */
function removePlaceholder(el: HTMLElement): void {
  if (el.getAttribute('data-permission-placeholder') === 'true') {
    const nextSibling = el.nextSibling
    if (nextSibling && nextSibling.nodeType === Node.ELEMENT_NODE) {
      const nextElement = nextSibling as HTMLElement
      if (nextElement.className === 'permission-placeholder') {
        nextElement.remove()
      }
    }
    el.style.display = ''
    el.removeAttribute('data-permission-placeholder')
  }
}

// ==================== v-permission 指令 ====================

/**
 * 权限指令 - 基于详细权限检查
 */
const permissionDirective = {
  async mounted(el: HTMLElement, binding: DirectiveBinding<PermissionDirectiveValue>) {
    await updatePermissionElement(el, binding)
  },

  async updated(el: HTMLElement, binding: DirectiveBinding<PermissionDirectiveValue>) {
    await updatePermissionElement(el, binding)
  },
}

/**
 * 更新权限元素状态
 */
async function updatePermissionElement(
  el: HTMLElement,
  binding: DirectiveBinding<PermissionDirectiveValue>
): Promise<void> {
  const permissionStore = getPermissionStore()
  if (!permissionStore) {
    return
  }

  const value = binding.value || {}
  const fallback = value.fallback || 'hide'
  const placeholder = value.placeholder || '您暂无权限访问此内容'

  try {
    let hasPermission = false

    // 检查角色权限
    if (value.roles && value.roles.length > 0) {
      const currentRole = permissionStore.currentRole
      hasPermission = currentRole ? value.roles.includes(currentRole) : false
    }

    // 检查详细权限
    if (!hasPermission && value.action && value.resourceType && value.resourceId) {
      hasPermission = await permissionStore.hasPermission(value.action, value.resourceType, value.resourceId)
    }

    // 检查自定义权限
    if (!hasPermission && value.checker) {
      const currentRole = permissionStore.currentRole
      hasPermission = currentRole ? value.checker(currentRole) : false
    }

    // 如果没有任何权限配置，默认允许
    if (!value.roles && !value.action && !value.checker) {
      hasPermission = true
    }

    // 根据权限结果更新元素状态
    updateElementState(el, hasPermission, fallback, placeholder)
  } catch (error) {
    console.error('权限指令检查失败:', error)
    // 出错时默认隐藏元素
    updateElementState(el, false, fallback, placeholder)
  }
}

// ==================== v-role 指令 ====================

/**
 * 角色指令 - 基于角色检查
 */
const roleDirective = {
  async mounted(el: HTMLElement, binding: DirectiveBinding<RoleDirectiveValue>) {
    await updateRoleElement(el, binding)
  },

  async updated(el: HTMLElement, binding: DirectiveBinding<RoleDirectiveValue>) {
    await updateRoleElement(el, binding)
  },
}

/**
 * 更新角色元素状态
 */
async function updateRoleElement(el: HTMLElement, binding: DirectiveBinding<RoleDirectiveValue>): Promise<void> {
  const permissionStore = getPermissionStore()
  if (!permissionStore) {
    return
  }

  const value = binding.value
  const fallback = value.fallback || 'hide'
  const placeholder = value.placeholder || '您的角色无权访问此内容'
  const mode = value.mode || 'any'

  try {
    const currentRole = permissionStore.currentRole
    let hasPermission = false

    if (currentRole) {
      const requiredRoles = Array.isArray(value.roles) ? value.roles : [value.roles]

      if (mode === 'any') {
        // 任意角色匹配
        hasPermission = requiredRoles.includes(currentRole)
      } else {
        // 所有角色匹配（通常用于多角色用户）
        const userRoles = permissionStore.availableRoles.map(role => role.type)
        hasPermission = requiredRoles.every(role => userRoles.includes(role))
      }
    }

    updateElementState(el, hasPermission, fallback, placeholder)
  } catch (error) {
    console.error('角色指令检查失败:', error)
    updateElementState(el, false, fallback, placeholder)
  }
}

// ==================== v-auth 指令 ====================

/**
 * 认证指令 - 检查用户是否已登录
 */
const authDirective = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | { fallback?: string; placeholder?: string }>) {
    updateAuthElement(el, binding)
  },

  updated(el: HTMLElement, binding: DirectiveBinding<string | { fallback?: string; placeholder?: string }>) {
    updateAuthElement(el, binding)
  },
}

/**
 * 更新认证元素状态
 */
function updateAuthElement(
  el: HTMLElement,
  binding: DirectiveBinding<string | { fallback?: string; placeholder?: string }>
): void {
  const permissionStore = getPermissionStore()
  if (!permissionStore) {
    return
  }

  const value = binding.value
  let fallback = 'hide'
  let placeholder = '请先登录'

  if (typeof value === 'object' && value !== null) {
    fallback = value.fallback || 'hide'
    placeholder = value.placeholder || '请先登录'
  } else if (typeof value === 'string') {
    fallback = value
  }

  const isLoggedIn = permissionStore.isLoggedIn
  updateElementState(el, isLoggedIn, fallback as any, placeholder)
}

// ==================== 通用元素状态更新函数 ====================

/**
 * 更新元素状态
 */
function updateElementState(
  el: HTMLElement,
  hasPermission: boolean,
  fallback: 'hide' | 'disable' | 'placeholder',
  placeholder: string
): void {
  // 先清除之前的状态
  showElement(el)
  enableElement(el)
  removePlaceholder(el)

  if (!hasPermission) {
    switch (fallback) {
      case 'hide':
        hideElement(el)
        break
      case 'disable':
        disableElement(el)
        break
      case 'placeholder':
        replaceWithPlaceholder(el, placeholder)
        break
    }
  }
}

// ==================== 指令注册函数 ====================

/**
 * 注册所有权限指令
 */
export function registerPermissionDirectives(app: App): void {
  app.directive('permission', permissionDirective)
  app.directive('role', roleDirective)
  app.directive('auth', authDirective)
}

// ==================== 导出指令 ====================

export { authDirective, permissionDirective, roleDirective }

// ==================== 类型导出 ====================

export type { PermissionDirectiveValue, RoleDirectiveValue }
