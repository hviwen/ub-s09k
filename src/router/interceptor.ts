import { isMp } from '@uni-helper/uni-env'
import { getRoutePermissionGuard } from '@/permission/router/RoutePermissionGuard'
import { usePermissionStore } from '@/permission/store/permissionStore'
import { AccessControlAction, UserRole } from '@/permission/types'
/**
 * by 菲鸽 on 2025-08-19
 * 路由拦截，通常也是登录拦截
 * 黑白名单的配置，请看 config.ts 文件， EXCLUDE_LOGIN_PATH_LIST
 *
 * 增强版：集成多角色权限管理系统
 */
import { useTokenStore } from '@/store/token'
import { isPageTabbar, tabbarStore } from '@/tabbar/store'
import { getAllPages, getLastPage, HOME_PAGE, parseUrlToObj } from '@/utils/index'
import { EXCLUDE_LOGIN_PATH_LIST, isNeedLoginMode, LOGIN_PAGE, LOGIN_PAGE_ENABLE_IN_MP } from './config'

export const LOG_ENABLE = false

export function judgeIsExcludePath(path: string) {
  const isDev = import.meta.env.DEV
  if (!isDev) {
    return EXCLUDE_LOGIN_PATH_LIST.includes(path)
  }
  const allExcludeLoginPages = getAllPages('excludeLoginPath') // dev 环境下，需要每次都重新获取，否则新配置就不会生效
  return EXCLUDE_LOGIN_PATH_LIST.includes(path) || (isDev && allExcludeLoginPages.some(page => page.path === path))
}

/**
 * 增强版路由权限检查
 * 集成多角色权限管理系统
 */
async function checkRoutePermission(path: string): Promise<{
  allowed: boolean
  redirectUrl?: string
  message?: string
}> {
  try {
    const permissionStore = usePermissionStore()
    const routeGuard = getRoutePermissionGuard()

    // 如果权限系统未初始化，使用传统检查方式
    if (!permissionStore.isInitialized) {
      return { allowed: true }
    }

    const currentRole = permissionStore.currentRole || UserRole.GUEST
    const result = await routeGuard.checkPagePermission(path, currentRole)

    if (result.allowed) {
      return { allowed: true }
    }

    // 根据访问控制动作确定重定向
    let redirectUrl = result.redirectUrl
    let message = result.message

    switch (result.action) {
      case AccessControlAction.LOGIN_GUIDANCE:
        redirectUrl = redirectUrl || LOGIN_PAGE
        message = message || '请先登录以访问此页面'
        break
      case AccessControlAction.ROLE_SWITCH_GUIDANCE:
        redirectUrl = redirectUrl || '/pages/role/switch'
        message = message || '请切换到相应角色以访问此页面'
        break
      case AccessControlAction.COMPLETE_RESTRICTION:
        redirectUrl = redirectUrl || HOME_PAGE
        message = message || '您无权访问此页面'
        break
      default:
        redirectUrl = redirectUrl || HOME_PAGE
        message = message || '访问受限'
    }

    return {
      allowed: false,
      redirectUrl,
      message,
    }
  }
  catch (error) {
    console.error('路由权限检查失败:', error)
    // 出错时允许访问，避免阻塞用户
    return { allowed: true }
  }
}

export const navigateToInterceptor = {
  // 注意，这里的url是 '/' 开头的，如 '/pages/index/index'，跟 'pages.json' 里面的 path 不同
  // 增加对相对路径的处理，BY 网友 @ideal
  // 增强版：集成多角色权限管理系统
  async invoke({ url, query }: { url: string, query?: Record<string, string> }) {
    if (url === undefined) {
      return
    }

    const result = await handleRouteNavigation(url, query)
    return result
  },
}

/**
 * 处理路由导航的核心逻辑
 */
async function handleRouteNavigation(url: string, query?: Record<string, string>): Promise<boolean> {
  let { path, query: _query } = parseUrlToObj(url)

  LOG_ENABLE && console.log('\n\n路由拦截器:-------------------------------------')
  LOG_ENABLE && console.log('路由拦截器 1: url->', url, ', query ->', query)
  const myQuery = { ..._query, ...query }
  LOG_ENABLE && console.log('路由拦截器 2: path->', path, ', _query ->', _query)
  LOG_ENABLE && console.log('路由拦截器 3: myQuery ->', myQuery)

  // 处理相对路径
  path = normalizeRoutePath(path)

  // 处理直接进入路由非首页时，tabbarIndex 不正确的问题
  tabbarStore.setAutoCurIdx(path)

  // 小程序里面使用平台自带的登录，则不走下面的逻辑
  if (isMp && LOGIN_PAGE_ENABLE_IN_MP) {
    return true
  }

  // 执行增强版权限检查
  const permissionResult = await checkRoutePermission(path)
  if (!permissionResult.allowed) {
    return handlePermissionDenied(permissionResult, path, myQuery)
  }

  // 执行传统登录检查（向后兼容）
  const loginResult = await checkLoginPermission(path, myQuery)
  return loginResult
}

/**
 * 标准化路由路径
 */
function normalizeRoutePath(path: string): string {
  if (!path.startsWith('/')) {
    const currentPath = getLastPage()?.route || ''
    const normalizedCurrentPath = currentPath.startsWith('/') ? currentPath : `/${currentPath}`
    const baseDir = normalizedCurrentPath.substring(0, normalizedCurrentPath.lastIndexOf('/'))
    return `${baseDir}/${path}`
  }
  return path
}

/**
 * 处理权限被拒绝的情况
 */
function handlePermissionDenied(
  permissionResult: { redirectUrl?: string, message?: string },
  originalPath: string,
  query: Record<string, string>,
): boolean {
  const redirectUrl = permissionResult.redirectUrl || LOGIN_PAGE

  // 显示权限提示
  if (permissionResult.message) {
    uni.showToast({
      title: permissionResult.message,
      icon: 'none',
      duration: 2000,
    })
  }

  // 构建完整路径用于重定向后返回
  let fullPath = originalPath
  if (Object.keys(query).length) {
    const queryString = Object.keys(query)
      .map(key => `${key}=${query[key]}`)
      .join('&')
    fullPath += `?${queryString}`
  }

  // 执行重定向
  const finalRedirectUrl = `${redirectUrl}?redirect=${encodeURIComponent(fullPath)}`

  if (isPageTabbar(redirectUrl)) {
    uni.switchTab({ url: redirectUrl })
  }
  else {
    uni.navigateTo({ url: finalRedirectUrl })
  }

  return false
}

/**
 * 传统登录权限检查（向后兼容）
 */
async function checkLoginPermission(path: string, myQuery: Record<string, string>): Promise<boolean> {
  const tokenStore = useTokenStore()
  LOG_ENABLE && console.log('tokenStore.hasLogin:', tokenStore.hasLogin)

  // 已登录用户的处理
  if (tokenStore.hasLogin) {
    return handleLoggedInUser(path, myQuery)
  }

  // 未登录用户的处理
  return handleNotLoggedInUser(path, myQuery)
}

/**
 * 处理已登录用户
 */
function handleLoggedInUser(path: string, myQuery: Record<string, string>): boolean {
  if (path !== LOGIN_PAGE) {
    return true
  }

  // 已登录但访问登录页，重定向到目标页面
  console.log('已经登录，但是还在登录页', myQuery.redirect)
  const targetUrl = myQuery.redirect || HOME_PAGE

  if (isPageTabbar(targetUrl)) {
    uni.switchTab({ url: targetUrl })
  }
  else {
    uni.navigateTo({ url: targetUrl })
  }

  return false
}
/**
 * 处理未登录用户
 */
function handleNotLoggedInUser(path: string, myQuery: Record<string, string>): boolean {
  let fullPath = path

  if (Object.keys(myQuery).length) {
    const queryString = Object.keys(myQuery)
      .map(key => `${key}=${myQuery[key]}`)
      .join('&')
    fullPath += `?${queryString}`
  }

  const redirectUrl = `${LOGIN_PAGE}?redirect=${encodeURIComponent(fullPath)}`

  // #region 1/2 默认需要登录的情况(白名单策略) ---------------------------
  if (isNeedLoginMode) {
    // 需要登录里面的 EXCLUDE_LOGIN_PATH_LIST 表示白名单，可以直接通过
    if (judgeIsExcludePath(path)) {
      return true
    }

    // 否则需要重定向到登录页
    if (path === LOGIN_PAGE) {
      return true
    }

    LOG_ENABLE && console.log('1 isNeedLogin(白名单策略) redirectUrl:', redirectUrl)
    uni.navigateTo({ url: redirectUrl })
    return false
  }
  // #endregion 1/2 默认需要登录的情况(白名单策略) ---------------------------

  // #region 2/2 默认不需要登录的情况(黑名单策略) ---------------------------
  // 不需要登录里面的 EXCLUDE_LOGIN_PATH_LIST 表示黑名单，需要重定向到登录页
  if (judgeIsExcludePath(path)) {
    LOG_ENABLE && console.log('2 isNeedLogin(黑名单策略) redirectUrl:', redirectUrl)
    uni.navigateTo({ url: redirectUrl })
    return false
  }
  // #endregion 2/2 默认不需要登录的情况(黑名单策略) ---------------------------

  return true
}

export const routeInterceptor = {
  install() {
    uni.addInterceptor('navigateTo', navigateToInterceptor)
    uni.addInterceptor('reLaunch', navigateToInterceptor)
    uni.addInterceptor('redirectTo', navigateToInterceptor)
    uni.addInterceptor('switchTab', navigateToInterceptor)
  },
}
