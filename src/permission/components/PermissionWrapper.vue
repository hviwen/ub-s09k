<!--
  权限包装组件 - 通用权限控制组件
  @description 根据用户角色和权限配置控制子组件的显示和交互
  @author unibest权限管理系统
  @version 1.0.0
-->

<template>
  <view v-if="shouldRender" :class="wrapperClass" @click="handleClick">
    <!-- 有权限时显示内容 -->
    <slot v-if="hasPermission" />

    <!-- 无权限时的占位内容 -->
    <slot v-else-if="showPlaceholder" name="placeholder">
      <view class="permission-placeholder">
        <view class="placeholder-icon">
          🔒
        </view>
        <view class="placeholder-text">
          {{ placeholderText }}
        </view>
        <view v-if="showUpgradeButton" class="placeholder-action">
          <button class="upgrade-btn" @click="handleUpgrade">
            {{ upgradeButtonText }}
          </button>
        </view>
      </view>
    </slot>
  </view>
</template>

<script setup lang="ts">
import type { AccessControlAction, PermissionAction, ResourceType, UserRole } from '../types'
import { computed, onMounted, ref, watch } from 'vue'
import { usePermissionStore } from '../store/permissionStore'

// ==================== 组件属性定义 ====================

interface Props {
  /** 需要的角色 */
  requiredRoles?: UserRole[]
  /** 需要的权限操作 */
  requiredAction?: PermissionAction
  /** 资源类型 */
  resourceType?: ResourceType
  /** 资源ID */
  resourceId?: string
  /** 是否显示占位符 */
  showPlaceholder?: boolean
  /** 占位符文本 */
  placeholderText?: string
  /** 是否显示升级按钮 */
  showUpgradeButton?: boolean
  /** 升级按钮文本 */
  upgradeButtonText?: string
  /** 无权限时是否完全隐藏 */
  hideWhenNoPermission?: boolean
  /** 是否禁用交互 */
  disableWhenNoPermission?: boolean
  /** 自定义权限检查函数 */
  customChecker?: (role: UserRole) => boolean
  /** 权限检查模式 */
  checkMode?: 'role' | 'permission' | 'custom'
  /** 额外的CSS类 */
  extraClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  requiredRoles: () => [],
  showPlaceholder: true,
  placeholderText: '您暂无权限访问此内容',
  showUpgradeButton: false,
  upgradeButtonText: '升级权限',
  hideWhenNoPermission: false,
  disableWhenNoPermission: false,
  checkMode: 'role',
})

const emit = defineEmits<Emits>()

// ==================== 组件事件定义 ====================

interface Emits {
  /** 权限检查完成 */
  permissionChecked: [hasPermission: boolean, action: AccessControlAction]
  /** 点击升级按钮 */
  upgrade: [role: UserRole]
  /** 点击组件 */
  click: [event: Event]
  /** 权限被拒绝 */
  permissionDenied: [reason: string]
}

// ==================== 响应式数据 ====================

const permissionStore = usePermissionStore()
const hasPermission = ref(false)
const isLoading = ref(true)
const lastCheckTime = ref(0)

// ==================== 计算属性 ====================

/**
 * 是否应该渲染组件
 */
const shouldRender = computed(() => {
  if (isLoading.value) {
    return false
  }

  if (props.hideWhenNoPermission && !hasPermission.value) {
    return false
  }

  return true
})

/**
 * 包装器CSS类
 */
const wrapperClass = computed(() => {
  const classes = ['permission-wrapper']

  if (!hasPermission.value && props.disableWhenNoPermission) {
    classes.push('permission-disabled')
  }

  if (props.extraClass) {
    classes.push(props.extraClass)
  }

  return classes.join(' ')
})

/**
 * 当前用户角色
 */
const currentRole = computed(() => permissionStore.currentRole)

// ==================== 权限检查方法 ====================

/**
 * 检查权限
 */
async function checkPermission(): Promise<void> {
  try {
    isLoading.value = true

    let permissionResult = false
    let action = AccessControlAction.COMPLETE_RESTRICTION

    switch (props.checkMode) {
      case 'role':
        permissionResult = await checkRolePermission()
        action = permissionResult ? AccessControlAction.UNRESTRICTED_ACCESS : AccessControlAction.ROLE_SWITCH_GUIDANCE
        break
      case 'permission':
        const result = await checkDetailedPermission()
        permissionResult = result.hasPermission
        action = result.action
        break
      case 'custom':
        permissionResult = await checkCustomPermission()
        action = permissionResult ? AccessControlAction.UNRESTRICTED_ACCESS : AccessControlAction.COMPLETE_RESTRICTION
        break
    }

    hasPermission.value = permissionResult
    lastCheckTime.value = Date.now()

    // 触发权限检查完成事件
    emit('permissionChecked', permissionResult, action)

    // 如果无权限，触发权限被拒绝事件
    if (!permissionResult) {
      emit('permissionDenied', getPermissionDeniedReason(action))
    }
  }
  catch (error) {
    console.error('权限检查失败:', error)
    hasPermission.value = false
    emit('permissionDenied', '权限检查异常')
  }
  finally {
    isLoading.value = false
  }
}

/**
 * 检查角色权限
 */
async function checkRolePermission(): Promise<boolean> {
  if (!currentRole.value) {
    return false
  }

  if (props.requiredRoles.length === 0) {
    return true
  }

  return props.requiredRoles.includes(currentRole.value)
}

/**
 * 检查详细权限
 */
async function checkDetailedPermission(): Promise<{ hasPermission: boolean, action: AccessControlAction }> {
  if (!props.requiredAction || !props.resourceType || !props.resourceId) {
    return { hasPermission: true, action: AccessControlAction.UNRESTRICTED_ACCESS }
  }

  const hasDetailedPermission = await permissionStore.hasPermission(
    props.requiredAction,
    props.resourceType,
    props.resourceId,
  )

  const action = hasDetailedPermission
    ? AccessControlAction.UNRESTRICTED_ACCESS
    : AccessControlAction.COMPLETE_RESTRICTION

  return { hasPermission: hasDetailedPermission, action }
}

/**
 * 检查自定义权限
 */
async function checkCustomPermission(): Promise<boolean> {
  if (!props.customChecker || !currentRole.value) {
    return false
  }

  return props.customChecker(currentRole.value)
}

/**
 * 获取权限被拒绝的原因
 */
function getPermissionDeniedReason(action: AccessControlAction): string {
  switch (action) {
    case AccessControlAction.LOGIN_GUIDANCE:
      return '需要登录才能访问'
    case AccessControlAction.ROLE_SWITCH_GUIDANCE:
      return '需要切换到相应角色'
    case AccessControlAction.APPROVAL_PENDING:
      return '权限申请审核中'
    case AccessControlAction.ACCOUNT_EXCEPTION:
      return '账户状态异常'
    default:
      return '权限不足'
  }
}

// ==================== 事件处理方法 ====================

/**
 * 处理组件点击
 */
function handleClick(event: Event): void {
  if (!hasPermission.value && props.disableWhenNoPermission) {
    event.stopPropagation()
    event.preventDefault()

    // 显示权限提示
    uni.showToast({
      title: props.placeholderText,
      icon: 'none',
      duration: 2000,
    })

    return
  }

  emit('click', event)
}

/**
 * 处理升级权限
 */
function handleUpgrade(): void {
  if (currentRole.value) {
    emit('upgrade', currentRole.value)
  }

  // 默认跳转到角色切换页面
  uni.navigateTo({
    url: '/pages/role/switch',
  }).catch((error) => {
    console.error('跳转角色切换页面失败:', error)
  })
}

// ==================== 生命周期和监听器 ====================

onMounted(() => {
  checkPermission()
})

// 监听角色变化，重新检查权限
watch(
  () => currentRole.value,
  () => {
    checkPermission()
  },
)

// 监听权限相关属性变化
watch(
  () => [props.requiredRoles, props.requiredAction, props.resourceType, props.resourceId, props.customChecker],
  () => {
    checkPermission()
  },
  { deep: true },
)

// ==================== 暴露给父组件的方法 ====================

defineExpose({
  checkPermission,
  hasPermission: () => hasPermission.value,
  isLoading: () => isLoading.value,
  lastCheckTime: () => lastCheckTime.value,
})
</script>

<style scoped>
.permission-wrapper {
  position: relative;
}

.permission-disabled {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}

.permission-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx 20rpx;
  text-align: center;
  background-color: #f8f9fa;
  border-radius: 12rpx;
  border: 2rpx dashed #dee2e6;
}

.placeholder-icon {
  font-size: 48rpx;
  margin-bottom: 16rpx;
  opacity: 0.6;
}

.placeholder-text {
  font-size: 28rpx;
  color: #6c757d;
  margin-bottom: 20rpx;
  line-height: 1.4;
}

.placeholder-action {
  margin-top: 16rpx;
}

.upgrade-btn {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8rpx;
  padding: 16rpx 32rpx;
  font-size: 28rpx;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.upgrade-btn:hover {
  background-color: #0056b3;
}

.upgrade-btn:active {
  background-color: #004085;
}
</style>
