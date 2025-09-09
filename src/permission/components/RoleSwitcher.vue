<!--
  角色切换组件 - 用户角色切换界面
  @description 提供用户角色切换功能，支持角色预览和切换确认
  @author unibest权限管理系统
  @version 1.0.0
-->

<template>
  <view class="role-switcher">
    <!-- 当前角色显示 -->
    <view class="current-role-section">
      <view class="section-title">
        当前角色
      </view>
      <view class="current-role-card">
        <view class="role-icon">
          {{ getRoleIcon(currentRole?.type) }}
        </view>
        <view class="role-info">
          <view class="role-name">
            {{ currentRole?.name || '未知角色' }}
          </view>
          <view class="role-description">
            {{ currentRole?.description || '暂无描述' }}
          </view>
        </view>
        <view class="role-status" :class="getRoleStatusClass(currentRole?.status)">
          {{ getRoleStatusText(currentRole?.status) }}
        </view>
      </view>
    </view>

    <!-- 可用角色列表 -->
    <view class="available-roles-section">
      <view class="section-title">
        可切换角色
      </view>
      <view class="roles-list">
        <view
          v-for="role in switchableRoles"
          :key="role.id"
          class="role-item"
          :class="{ 'role-item-disabled': !canSwitchToRole(role) }"
          @click="handleRoleSelect(role)"
        >
          <view class="role-icon">
            {{ getRoleIcon(role.type) }}
          </view>
          <view class="role-info">
            <view class="role-name">
              {{ role.name }}
            </view>
            <view class="role-description">
              {{ role.description }}
            </view>
            <view class="role-permissions">
              权限数量: {{ role.permissions.length }}
            </view>
          </view>
          <view class="role-action">
            <button
              v-if="canSwitchToRole(role)"
              class="switch-btn"
              :disabled="isSwitching"
              @click.stop="confirmRoleSwitch(role)"
            >
              {{ isSwitching ? '切换中...' : '切换' }}
            </button>
            <view v-else class="switch-disabled">
              {{ getSwitchDisabledReason(role) }}
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 角色切换历史 -->
    <view v-if="showHistory && switchHistory.length > 0" class="history-section">
      <view class="section-title">
        切换历史
      </view>
      <view class="history-list">
        <view
          v-for="record in displayHistory"
          :key="record.id"
          class="history-item"
        >
          <view class="history-info">
            <view class="history-text">
              {{ getRoleDisplayName(record.fromRole) }} → {{ getRoleDisplayName(record.toRole) }}
            </view>
            <view class="history-time">
              {{ formatTime(record.switchTime) }}
            </view>
            <view v-if="record.reason" class="history-reason">
              {{ record.reason }}
            </view>
          </view>
          <view class="history-status" :class="{ success: record.success, failed: !record.success }">
            {{ record.success ? '成功' : '失败' }}
          </view>
        </view>
      </view>
    </view>

    <!-- 角色切换确认弹窗 -->
    <uni-popup ref="confirmPopup" type="dialog">
      <uni-popup-dialog
        :title="confirmDialogTitle"
        :content="confirmDialogContent"
        :before-close="true"
        @close="handleConfirmClose"
        @confirm="handleConfirmSwitch"
      >
        <template #default>
          <view class="confirm-content">
            <view class="confirm-role-info">
              <view class="confirm-role-icon">
                {{ getRoleIcon(selectedRole?.type) }}
              </view>
              <view class="confirm-role-details">
                <view class="confirm-role-name">
                  {{ selectedRole?.name }}
                </view>
                <view class="confirm-role-description">
                  {{ selectedRole?.description }}
                </view>
              </view>
            </view>
            <view class="confirm-permissions">
              <view class="permissions-title">
                角色权限预览:
              </view>
              <view class="permissions-list">
                <view
                  v-for="permission in selectedRole?.permissions.slice(0, 5)"
                  :key="permission.id"
                  class="permission-item"
                >
                  {{ permission.name }}
                </view>
                <view v-if="(selectedRole?.permissions.length || 0) > 5" class="permission-more">
                  还有 {{ (selectedRole?.permissions.length || 0) - 5 }} 项权限...
                </view>
              </view>
            </view>
          </view>
        </template>
      </uni-popup-dialog>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import type { Role, RoleStatus, RoleSwitchRecord, UserRole } from '../types'
import { computed, onMounted, ref } from 'vue'
import { usePermissionStore } from '../store/permissionStore'

// ==================== 组件属性定义 ====================

interface Props {
  /** 是否显示切换历史 */
  showHistory?: boolean
  /** 历史记录显示数量 */
  historyLimit?: number
  /** 是否自动刷新 */
  autoRefresh?: boolean
  /** 刷新间隔（毫秒） */
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  showHistory: true,
  historyLimit: 10,
  autoRefresh: false,
  refreshInterval: 30000,
})

const emit = defineEmits<Emits>()

// ==================== 组件事件定义 ====================

interface Emits {
  /** 角色切换成功 */
  switchSuccess: [fromRole: UserRole, toRole: UserRole]
  /** 角色切换失败 */
  switchFailed: [error: Error]
  /** 角色选择 */
  roleSelected: [role: Role]
}

// ==================== 响应式数据 ====================

const permissionStore = usePermissionStore()
const confirmPopup = ref()
const selectedRole = ref<Role | null>(null)
const isSwitching = ref(false)
const switchHistory = ref<RoleSwitchRecord[]>([])

// ==================== 计算属性 ====================

/**
 * 当前角色
 */
const currentRole = computed(() => permissionStore.currentRoleInfo)

/**
 * 可切换的角色列表
 */
const switchableRoles = computed(() => {
  return permissionStore.availableRoles.filter(role =>
    role.type !== permissionStore.currentRole,
  )
})

/**
 * 显示的历史记录
 */
const displayHistory = computed(() => {
  return switchHistory.value.slice(0, props.historyLimit)
})

/**
 * 确认对话框标题
 */
const confirmDialogTitle = computed(() => {
  return `切换到${selectedRole.value?.name || '未知角色'}`
})

/**
 * 确认对话框内容
 */
const confirmDialogContent = computed(() => {
  return `确定要切换到"${selectedRole.value?.name}"角色吗？切换后您将获得该角色的相应权限。`
})

// ==================== 方法定义 ====================

/**
 * 获取角色图标
 */
function getRoleIcon(roleType?: UserRole): string {
  const iconMap = {
    [UserRole.GUEST]: '👤',
    [UserRole.REGULAR]: '👨‍💼',
    [UserRole.CHANNEL]: '🏢',
    [UserRole.INSTITUTIONAL]: '🏛️',
    [UserRole.ADMIN]: '👑',
  }
  return iconMap[roleType || UserRole.GUEST] || '❓'
}

/**
 * 获取角色状态样式类
 */
function getRoleStatusClass(status?: RoleStatus): string {
  const classMap = {
    active: 'status-active',
    pending: 'status-pending',
    disabled: 'status-disabled',
    expired: 'status-expired',
  }
  return classMap[status || 'active'] || 'status-unknown'
}

/**
 * 获取角色状态文本
 */
function getRoleStatusText(status?: RoleStatus): string {
  const textMap = {
    active: '正常',
    pending: '待审核',
    disabled: '已停用',
    expired: '已过期',
  }
  return textMap[status || 'active'] || '未知'
}

/**
 * 检查是否可以切换到指定角色
 */
function canSwitchToRole(role: Role): boolean {
  if (isSwitching.value) {
    return false
  }

  if (role.status !== 'active') {
    return false
  }

  if (role.expiresAt && role.expiresAt < Date.now()) {
    return false
  }

  return permissionStore.canSwitchRole
}

/**
 * 获取切换禁用原因
 */
function getSwitchDisabledReason(role: Role): string {
  if (isSwitching.value) {
    return '切换中...'
  }

  if (role.status === 'pending') {
    return '待审核'
  }

  if (role.status === 'disabled') {
    return '已停用'
  }

  if (role.status === 'expired') {
    return '已过期'
  }

  if (role.expiresAt && role.expiresAt < Date.now()) {
    return '已过期'
  }

  return '不可切换'
}

/**
 * 处理角色选择
 */
function handleRoleSelect(role: Role): void {
  if (!canSwitchToRole(role)) {
    return
  }

  selectedRole.value = role
  emit('roleSelected', role)
}

/**
 * 确认角色切换
 */
function confirmRoleSwitch(role: Role): void {
  if (!canSwitchToRole(role)) {
    return
  }

  selectedRole.value = role
  confirmPopup.value?.open()
}

/**
 * 处理确认对话框关闭
 */
function handleConfirmClose(): void {
  selectedRole.value = null
}

/**
 * 处理确认切换
 */
async function handleConfirmSwitch(): Promise<void> {
  if (!selectedRole.value) {
    return
  }

  try {
    isSwitching.value = true

    const fromRole = permissionStore.currentRole!
    const toRole = selectedRole.value.type

    const success = await permissionStore.switchRole(toRole, '用户主动切换')

    if (success) {
      emit('switchSuccess', fromRole, toRole)

      // 刷新切换历史
      await loadSwitchHistory()

      uni.showToast({
        title: `已切换到${selectedRole.value.name}`,
        icon: 'success',
      })
    }
    else {
      throw new Error('角色切换失败')
    }
  }
  catch (error) {
    console.error('角色切换失败:', error)
    emit('switchFailed', error as Error)

    uni.showToast({
      title: '角色切换失败',
      icon: 'error',
    })
  }
  finally {
    isSwitching.value = false
    selectedRole.value = null
    confirmPopup.value?.close()
  }
}

/**
 * 加载切换历史
 */
async function loadSwitchHistory(): Promise<void> {
  try {
    if (permissionStore.currentUserId) {
      const history = await permissionStore.roleSwitchService.getRoleSwitchHistory(
        permissionStore.currentUserId,
        props.historyLimit,
      )
      switchHistory.value = history
    }
  }
  catch (error) {
    console.error('加载切换历史失败:', error)
  }
}

/**
 * 获取角色显示名称
 */
function getRoleDisplayName(roleType: UserRole): string {
  const nameMap = {
    [UserRole.GUEST]: '游客',
    [UserRole.REGULAR]: '普通用户',
    [UserRole.CHANNEL]: '渠道用户',
    [UserRole.INSTITUTIONAL]: '机构用户',
    [UserRole.ADMIN]: '管理员',
  }
  return nameMap[roleType] || '未知角色'
}

/**
 * 格式化时间
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) { // 1分钟内
    return '刚刚'
  }
  else if (diff < 3600000) { // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`
  }
  else if (diff < 86400000) { // 1天内
    return `${Math.floor(diff / 3600000)}小时前`
  }
  else {
    return date.toLocaleDateString()
  }
}

// ==================== 生命周期 ====================

onMounted(() => {
  loadSwitchHistory()
})

// ==================== 暴露给父组件的方法 ====================

defineExpose({
  loadSwitchHistory,
  switchToRole: (roleType: UserRole) => {
    const role = switchableRoles.value.find(r => r.type === roleType)
    if (role) {
      confirmRoleSwitch(role)
    }
  },
})
</script>

<style scoped>
.role-switcher {
  padding: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.current-role-section {
  margin-bottom: 40rpx;
}

.current-role-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: #f8f9fa;
  border-radius: 12rpx;
  border-left: 6rpx solid #007bff;
}

.role-icon {
  font-size: 48rpx;
  margin-right: 20rpx;
}

.role-info {
  flex: 1;
}

.role-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.role-description {
  font-size: 26rpx;
  color: #666;
  line-height: 1.4;
}

.role-permissions {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}

.role-status {
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  font-weight: bold;
}

.status-active {
  background-color: #d4edda;
  color: #155724;
}

.status-pending {
  background-color: #fff3cd;
  color: #856404;
}

.status-disabled {
  background-color: #f8d7da;
  color: #721c24;
}

.status-expired {
  background-color: #e2e3e5;
  color: #383d41;
}

.available-roles-section {
  margin-bottom: 40rpx;
}

.roles-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.role-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: white;
  border-radius: 12rpx;
  border: 2rpx solid #e9ecef;
  transition: all 0.3s ease;
}

.role-item:hover {
  border-color: #007bff;
  box-shadow: 0 4rpx 12rpx rgba(0, 123, 255, 0.1);
}

.role-item-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.role-action {
  margin-left: auto;
}

.switch-btn {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 8rpx;
  padding: 12rpx 24rpx;
  font-size: 26rpx;
  cursor: pointer;
}

.switch-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.switch-disabled {
  font-size: 24rpx;
  color: #6c757d;
  padding: 12rpx 24rpx;
}

.history-section {
  margin-bottom: 40rpx;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 16rpx;
  background-color: #f8f9fa;
  border-radius: 8rpx;
}

.history-info {
  flex: 1;
}

.history-text {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 4rpx;
}

.history-time {
  font-size: 24rpx;
  color: #999;
}

.history-reason {
  font-size: 24rpx;
  color: #666;
  margin-top: 4rpx;
}

.history-status {
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
  font-weight: bold;
}

.history-status.success {
  background-color: #d4edda;
  color: #155724;
}

.history-status.failed {
  background-color: #f8d7da;
  color: #721c24;
}

.confirm-content {
  padding: 20rpx 0;
}

.confirm-role-info {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.confirm-role-icon {
  font-size: 48rpx;
  margin-right: 16rpx;
}

.confirm-role-details {
  flex: 1;
}

.confirm-role-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.confirm-role-description {
  font-size: 26rpx;
  color: #666;
}

.confirm-permissions {
  margin-top: 20rpx;
}

.permissions-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
}

.permissions-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.permission-item {
  font-size: 26rpx;
  color: #666;
  padding: 8rpx 12rpx;
  background-color: #f8f9fa;
  border-radius: 6rpx;
}

.permission-more {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  padding: 8rpx;
}
</style>
