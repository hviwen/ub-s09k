<template>
  <view class="navigation-test">
    <view class="header">
      <text class="title">导航测试页面</text>
      <text class="platform">当前平台: {{ platformInfo }}</text>
    </view>

    <view class="test-section">
      <text class="section-title">TabBar 页面测试</text>
      
      <button 
        class="test-btn" 
        @click="testSwitchTab('/pages/index/index')"
      >
        测试 switchTab 到首页
      </button>
      
      <button 
        class="test-btn" 
        @click="testSwitchTab('/pages/about/about')"
      >
        测试 switchTab 到关于页
      </button>
      
      <button 
        class="test-btn" 
        @click="testSwitchTab('/pages/me/me')"
      >
        测试 switchTab 到我的页面
      </button>
    </view>

    <view class="test-section">
      <text class="section-title">普通页面测试</text>
      
      <button 
        class="test-btn" 
        @click="testNavigateTo('/pages/login/login')"
      >
        测试 navigateTo 到登录页
      </button>
      
      <button 
        class="test-btn" 
        @click="testNavigateTo('/pages/login/login?redirect=/pages/about/about')"
      >
        测试 navigateTo 带参数
      </button>
    </view>

    <view class="test-section">
      <text class="section-title">错误测试</text>
      
      <button 
        class="test-btn error-btn" 
        @click="testSwitchTabError"
      >
        测试 switchTab 错误情况
      </button>
      
      <button 
        class="test-btn error-btn" 
        @click="testNavigateToError"
      >
        测试 navigateTo 错误情况
      </button>
    </view>

    <view class="log-section">
      <text class="section-title">测试日志</text>
      <scroll-view class="log-container" scroll-y>
        <view 
          v-for="(log, index) in logs" 
          :key="index" 
          class="log-item"
          :class="{ 'log-error': log.type === 'error', 'log-success': log.type === 'success' }"
        >
          <text class="log-time">{{ log.time }}</text>
          <text class="log-content">{{ log.message }}</text>
        </view>
      </scroll-view>
      
      <button class="clear-btn" @click="clearLogs">清空日志</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { isMp, isH5, isApp } from '@uni-helper/uni-env'
import { isPageTabBar } from '@/tabbar/store'

interface LogItem {
  time: string
  message: string
  type: 'info' | 'success' | 'error'
}

const logs = ref<LogItem[]>([])
const platformInfo = ref('')

onMounted(() => {
  platformInfo.value = isMp ? '小程序' : isH5 ? 'H5' : isApp ? 'APP' : '未知'
  addLog(`页面加载完成，当前平台: ${platformInfo.value}`, 'info')
})

function addLog(message: string, type: LogItem['type'] = 'info') {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  
  logs.value.unshift({
    time,
    message,
    type
  })
  
  // 限制日志数量
  if (logs.value.length > 50) {
    logs.value = logs.value.slice(0, 50)
  }
}

function testSwitchTab(url: string) {
  addLog(`开始测试 switchTab: ${url}`, 'info')
  
  // 检查是否是有效的 tabBar 页面
  if (!isPageTabBar(url)) {
    addLog(`错误: ${url} 不是有效的 tabBar 页面`, 'error')
    return
  }
  
  uni.switchTab({
    url,
    success: () => {
      addLog(`switchTab 成功: ${url}`, 'success')
    },
    fail: (err) => {
      addLog(`switchTab 失败: ${url}, 错误: ${JSON.stringify(err)}`, 'error')
    }
  })
}

function testNavigateTo(url: string) {
  addLog(`开始测试 navigateTo: ${url}`, 'info')
  
  uni.navigateTo({
    url,
    success: () => {
      addLog(`navigateTo 成功: ${url}`, 'success')
    },
    fail: (err) => {
      addLog(`navigateTo 失败: ${url}, 错误: ${JSON.stringify(err)}`, 'error')
    }
  })
}

function testSwitchTabError() {
  addLog('测试 switchTab 错误情况', 'info')
  
  // 测试空 URL
  try {
    uni.switchTab({
      url: '',
      success: () => {
        addLog('switchTab 空URL 意外成功', 'error')
      },
      fail: (err) => {
        addLog(`switchTab 空URL 正确失败: ${JSON.stringify(err)}`, 'success')
      }
    })
  } catch (error) {
    addLog(`switchTab 空URL 抛出异常: ${error}`, 'success')
  }
  
  // 测试非 tabBar 页面
  uni.switchTab({
    url: '/pages/login/login',
    success: () => {
      addLog('switchTab 非tabBar页面 意外成功', 'error')
    },
    fail: (err) => {
      addLog(`switchTab 非tabBar页面 正确失败: ${JSON.stringify(err)}`, 'success')
    }
  })
}

function testNavigateToError() {
  addLog('测试 navigateTo 错误情况', 'info')
  
  // 测试空 URL
  try {
    uni.navigateTo({
      url: '',
      success: () => {
        addLog('navigateTo 空URL 意外成功', 'error')
      },
      fail: (err) => {
        addLog(`navigateTo 空URL 正确失败: ${JSON.stringify(err)}`, 'success')
      }
    })
  } catch (error) {
    addLog(`navigateTo 空URL 抛出异常: ${error}`, 'success')
  }
}

function clearLogs() {
  logs.value = []
  addLog('日志已清空', 'info')
}
</script>

<style lang="scss" scoped>
.navigation-test {
  padding: 20rpx;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
  
  .title {
    display: block;
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 10rpx;
  }
  
  .platform {
    display: block;
    font-size: 28rpx;
    color: #666;
  }
}

.test-section {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
  
  .section-title {
    display: block;
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
  }
}

.test-btn {
  width: 100%;
  height: 80rpx;
  background: #007aff;
  color: white;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
  margin-bottom: 20rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.error-btn {
    background: #ff3b30;
  }
  
  &:active {
    opacity: 0.8;
  }
}

.log-section {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
  
  .section-title {
    display: block;
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
  }
}

.log-container {
  height: 400rpx;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.log-item {
  margin-bottom: 10rpx;
  padding: 10rpx;
  border-radius: 4rpx;
  background: #f8f8f8;
  
  &.log-success {
    background: #e8f5e8;
    border-left: 4rpx solid #4caf50;
  }
  
  &.log-error {
    background: #ffeaea;
    border-left: 4rpx solid #f44336;
  }
  
  .log-time {
    font-size: 24rpx;
    color: #999;
    margin-right: 20rpx;
  }
  
  .log-content {
    font-size: 26rpx;
    color: #333;
  }
}

.clear-btn {
  width: 100%;
  height: 60rpx;
  background: #ff9500;
  color: white;
  border: none;
  border-radius: 8rpx;
  font-size: 26rpx;
  
  &:active {
    opacity: 0.8;
  }
}
</style>
