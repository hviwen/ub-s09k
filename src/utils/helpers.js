/**
 * 通用工具函数集合
 * 这个文件展示了如何在宽松的 TypeScript 环境中使用 JavaScript 开发
 */

/**
 * 格式化日期
 * @param {Date|string|number} date - 日期对象、字符串或时间戳
 * @param {string} format - 格式化模式，默认 'YYYY-MM-DD'
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date)
  
  if (isNaN(d.getTime())) {
    return '无效日期'
  }
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否为有效邮箱
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 验证手机号格式（中国大陆）
 * @param {string} phone - 手机号
 * @returns {boolean} 是否为有效手机号
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false
  }
  
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

/**
 * 深拷贝对象
 * @param {any} obj - 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime())
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item))
  }
  
  if (typeof obj === 'object') {
    const cloned = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }
  
  return obj
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, delay = 300) {
  let timeoutId
  
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(func, limit = 300) {
  let inThrottle
  
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 生成随机字符串
 * @param {number} length - 字符串长度
 * @param {string} chars - 可选字符集
 * @returns {string} 随机字符串
 */
export function randomString(length = 8, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * 获取 URL 参数
 * @param {string} name - 参数名
 * @param {string} url - URL 字符串，默认为当前页面 URL
 * @returns {string|null} 参数值
 */
export function getUrlParam(name, url = window.location.href) {
  const urlObj = new URL(url)
  return urlObj.searchParams.get(name)
}

/**
 * 设置本地存储（带过期时间）
 * @param {string} key - 存储键
 * @param {any} value - 存储值
 * @param {number} expireMinutes - 过期时间（分钟）
 */
export function setStorageWithExpire(key, value, expireMinutes = 60) {
  const expireTime = Date.now() + expireMinutes * 60 * 1000
  const data = {
    value,
    expireTime
  }
  
  try {
    uni.setStorageSync(key, JSON.stringify(data))
  } catch (error) {
    console.error('存储失败:', error)
  }
}

/**
 * 获取本地存储（检查过期时间）
 * @param {string} key - 存储键
 * @returns {any|null} 存储值或 null
 */
export function getStorageWithExpire(key) {
  try {
    const dataStr = uni.getStorageSync(key)
    if (!dataStr) return null
    
    const data = JSON.parse(dataStr)
    
    if (Date.now() > data.expireTime) {
      uni.removeStorageSync(key)
      return null
    }
    
    return data.value
  } catch (error) {
    console.error('读取存储失败:', error)
    return null
  }
}

/**
 * 简单的表单验证器
 * @param {Object} formData - 表单数据
 * @param {Object} rules - 验证规则
 * @returns {Object} 验证结果 { isValid: boolean, errors: Object }
 */
export function validateForm(formData, rules) {
  const errors = {}
  let isValid = true
  
  for (const field in rules) {
    const rule = rules[field]
    const value = formData[field]
    
    // 必填验证
    if (rule.required && (!value || value.toString().trim() === '')) {
      errors[field] = rule.message || `${field} 是必填项`
      isValid = false
      continue
    }
    
    // 如果值为空且不是必填，跳过其他验证
    if (!value && !rule.required) {
      continue
    }
    
    // 最小长度验证
    if (rule.minLength && value.length < rule.minLength) {
      errors[field] = `${field} 最少需要 ${rule.minLength} 个字符`
      isValid = false
      continue
    }
    
    // 最大长度验证
    if (rule.maxLength && value.length > rule.maxLength) {
      errors[field] = `${field} 最多允许 ${rule.maxLength} 个字符`
      isValid = false
      continue
    }
    
    // 正则验证
    if (rule.pattern && !rule.pattern.test(value)) {
      errors[field] = rule.message || `${field} 格式不正确`
      isValid = false
      continue
    }
    
    // 自定义验证函数
    if (rule.validator && typeof rule.validator === 'function') {
      const result = rule.validator(value, formData)
      if (result !== true) {
        errors[field] = result || `${field} 验证失败`
        isValid = false
      }
    }
  }
  
  return { isValid, errors }
}

/**
 * 简单的 Toast 提示封装
 * @param {string} title - 提示内容
 * @param {string} icon - 图标类型
 * @param {number} duration - 显示时长
 */
export function showToast(title, icon = 'none', duration = 2000) {
  uni.showToast({
    title,
    icon,
    duration
  })
}

/**
 * 简单的确认对话框封装
 * @param {string} content - 对话框内容
 * @param {string} title - 对话框标题
 * @returns {Promise<boolean>} 用户是否确认
 */
export function showConfirm(content, title = '提示') {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm)
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}
