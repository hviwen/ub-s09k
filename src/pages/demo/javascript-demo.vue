<script setup>
// 这个页面展示了如何在宽松的 TypeScript 环境中使用 JavaScript 开发
// 注意：没有 lang="ts"，直接使用 JavaScript

import { computed, onMounted, ref } from 'vue'
import { formatDate, showConfirm, showToast, validateEmail } from '@/utils/helpers.js'

// 页面配置
definePage({
  style: {
    navigationBarTitleText: 'JavaScript 开发示例',
  },
})

// ==================== 响应式数据 ====================

// 用户信息 - 不需要类型注解
const userInfo = ref({
  name: '',
  email: '',
  phone: '',
  birthday: null,
})

// 表单验证错误
const errors = ref({})

// 加载状态
const loading = ref(false)

// 用户列表
const userList = ref([])

// ==================== 计算属性 ====================

// 表单是否有效 - 不需要返回类型注解
const isFormValid = computed(() => {
  return userInfo.value.name
    && userInfo.value.email
    && validateEmail(userInfo.value.email)
    && Object.keys(errors.value).length === 0
})

// 格式化的生日
const formattedBirthday = computed(() => {
  if (!userInfo.value.birthday)
    return '未设置'
  return formatDate(userInfo.value.birthday, 'YYYY年MM月DD日')
})

// ==================== 方法 ====================

// 验证表单 - 不需要参数和返回值类型注解
function validateForm() {
  errors.value = {}

  if (!userInfo.value.name.trim()) {
    errors.value.name = '请输入姓名'
  }

  if (!userInfo.value.email.trim()) {
    errors.value.email = '请输入邮箱'
  } else if (!validateEmail(userInfo.value.email)) {
    errors.value.email = '邮箱格式不正确'
  }

  return Object.keys(errors.value).length === 0
}

// 保存用户信息
async function saveUserInfo() {
  if (!validateForm()) {
    showToast('请检查表单信息', 'error')
    return
  }

  loading.value = true

  try {
    // 模拟 API 调用 - 不需要类型注解
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 添加到用户列表
    const newUser = {
      id: Date.now(),
      ...userInfo.value,
      createdAt: new Date(),
    }

    userList.value.push(newUser)

    // 重置表单
    userInfo.value = {
      name: '',
      email: '',
      phone: '',
      birthday: null,
    }

    showToast('保存成功', 'success')
  } catch (error) {
    console.error('保存失败:', error)
    showToast('保存失败，请重试', 'error')
  } finally {
    loading.value = false
  }
}

// 删除用户
async function deleteUser(userId) {
  const confirmed = await showConfirm('确定要删除这个用户吗？')

  if (confirmed) {
    userList.value = userList.value.filter(user => user.id !== userId)
    showToast('删除成功', 'success')
  }
}

// 选择生日
function selectBirthday() {
  uni.showDatePicker({
    current: userInfo.value.birthday || new Date(),
    success: (res) => {
      userInfo.value.birthday = new Date(res.year, res.month - 1, res.day)
    },
  })
}

// 重置表单
function resetForm() {
  userInfo.value = {
    name: '',
    email: '',
    phone: '',
    birthday: null,
  }
  errors.value = {}
}

// ==================== 生命周期 ====================

onMounted(() => {
  console.log('页面加载完成')
  // 可以在这里初始化数据
})

// ==================== 权限检查示例 ====================

// 简单的权限检查 - 不使用复杂的 TypeScript 类型
function checkPermission(action) {
  // 这里可以调用权限系统，但用简单的方式
  // 不需要复杂的类型定义

  const userRole = 'user' // 简化的角色获取

  const permissions = {
    user: ['read', 'create'],
    admin: ['read', 'create', 'update', 'delete'],
  }

  return permissions[userRole]?.includes(action) || false
}

// 带权限检查的操作
function handleAction(action, callback) {
  if (checkPermission(action)) {
    callback()
  } else {
    showToast('没有权限执行此操作', 'error')
  }
}
</script>

<template>
  <view class="page">
    <view class="header">
      <text class="title">JavaScript 开发示例</text>
      <text class="subtitle">展示在宽松 TypeScript 环境中的 JavaScript 开发</text>
    </view>

    <!-- 用户信息表单 -->
    <view class="form-section">
      <view class="section-title">
        用户信息
      </view>

      <view class="form-item">
        <text class="label">姓名 *</text>
        <input
          v-model="userInfo.name"
          class="input"
          placeholder="请输入姓名"
          @blur="validateForm"
        >
        <text v-if="errors.name" class="error">{{ errors.name }}</text>
      </view>

      <view class="form-item">
        <text class="label">邮箱 *</text>
        <input
          v-model="userInfo.email"
          class="input"
          placeholder="请输入邮箱"
          @blur="validateForm"
        >
        <text v-if="errors.email" class="error">{{ errors.email }}</text>
      </view>

      <view class="form-item">
        <text class="label">手机号</text>
        <input
          v-model="userInfo.phone"
          class="input"
          placeholder="请输入手机号"
        >
      </view>

      <view class="form-item">
        <text class="label">生日</text>
        <view class="birthday-selector" @click="selectBirthday">
          <text class="birthday-text">{{ formattedBirthday }}</text>
          <text class="arrow">></text>
        </view>
      </view>

      <view class="form-actions">
        <button
          class="btn btn-primary"
          :disabled="!isFormValid || loading"
          @click="saveUserInfo"
        >
          {{ loading ? '保存中...' : '保存' }}
        </button>

        <button
          class="btn btn-secondary"
          @click="resetForm"
        >
          重置
        </button>
      </view>
    </view>

    <!-- 用户列表 -->
    <view v-if="userList.length > 0" class="list-section">
      <view class="section-title">
        用户列表
      </view>

      <view
        v-for="user in userList"
        :key="user.id"
        class="user-item"
      >
        <view class="user-info">
          <text class="user-name">{{ user.name }}</text>
          <text class="user-email">{{ user.email }}</text>
          <text class="user-date">{{ formatDate(user.createdAt, 'YYYY-MM-DD HH:mm') }}</text>
        </view>

        <view class="user-actions">
          <button
            class="btn btn-small btn-danger"
            @click="handleAction('delete', () => deleteUser(user.id))"
          >
            删除
          </button>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <text class="empty-text">暂无用户数据</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 30px;

  .title {
    display: block;
    font-size: 24px;
    font-weight: bold;
    color: #333;
    margin-bottom: 8px;
  }

  .subtitle {
    display: block;
    font-size: 14px;
    color: #666;
  }
}

.form-section,
.list-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 20px;
}

.form-item {
  margin-bottom: 20px;

  .label {
    display: block;
    font-size: 14px;
    color: #333;
    margin-bottom: 8px;
  }

  .input {
    width: 100%;
    height: 44px;
    padding: 0 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
  }

  .error {
    display: block;
    color: #ff4757;
    font-size: 12px;
    margin-top: 4px;
  }
}

.birthday-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;

  .birthday-text {
    color: #333;
  }

  .arrow {
    color: #999;
  }
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 30px;
}

.btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;

  &.btn-primary {
    background: #007aff;
    color: white;

    &:disabled {
      background: #ccc;
    }
  }

  &.btn-secondary {
    background: #f8f8f8;
    color: #333;
  }

  &.btn-danger {
    background: #ff4757;
    color: white;
  }

  &.btn-small {
    flex: none;
    width: 60px;
    height: 32px;
    font-size: 14px;
  }
}

.user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.user-info {
  flex: 1;

  .user-name {
    display: block;
    font-size: 16px;
    font-weight: bold;
    color: #333;
    margin-bottom: 4px;
  }

  .user-email {
    display: block;
    font-size: 14px;
    color: #666;
    margin-bottom: 4px;
  }

  .user-date {
    display: block;
    font-size: 12px;
    color: #999;
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;

  .empty-text {
    color: #999;
    font-size: 16px;
  }
}
</style>
