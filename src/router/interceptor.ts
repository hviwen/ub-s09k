import { isMp } from '@uni-helper/uni-env'
import { getRoutePermissionGuard } from '@/permission/router/RoutePermissionGuard'
import { usePermissionStore } from '@/permission/store/permissionStore'
import { AccessControlAction, UserRole } from '@/permission/types'
import { useTokenStore } from '@/store/token'
import { isPageTabBar, tabBarStore } from '@/tabbar/store'
import { getAllPages, getLastPage, HOME_PAGE, parseUrlToObj } from '@/utils/index'
import { EXCLUDE_LOGIN_PATH_LIST, isNeedLoginMode, LOGIN_PAGE, LOGIN_PAGE_ENABLE_IN_MP } from './config'

export const LOG_ENABLE = false

export function judgeIsExcludePath(path: string) {
  console.log('judgeIsExcludePath:', path)
  const isDev = import.meta.env.DEV
  if (!isDev) {
    return EXCLUDE_LOGIN_PATH_LIST.includes(path)
  }
  const allExcludeLoginPages = getAllPages('excludeLoginPath') // dev 环境下，需要每次都重新获取，否则新配置就不会生效
  console.log('judgeIsExcludePath allExcludeLoginPages:', allExcludeLoginPages)
  return EXCLUDE_LOGIN_PATH_LIST.includes(path) || (isDev && allExcludeLoginPages.some(page => page.path === path))
}

/**
 * Helper: 从可能包含 query 的 url 中提取用于 switchTab 的纯 path，并保证以 '/' 开头
 */
function extractPathForSwitch(url?: string): string | undefined {
  if (!url) return undefined
  const idx = url.indexOf('?')
  let path = idx === -1 ? url : url.slice(0, idx)
  if (!path) return undefined
  if (!path.startsWith('/')) path = `/${path}`
  return path
}

/**
 * Helper: 安全地调用 switchTab / navigateTo，避免传入 undefined
 */
function safeNavigate(urlWithQuery?: string) {
  const pathForSwitch = extractPathForSwitch(urlWithQuery)
  if (pathForSwitch && isPageTabBar(pathForSwitch)) {
    uni.switchTab({ url: pathForSwitch })
    return
  }

  // 如果不能 switchTab，则使用带 query 的完整地址（若传入为 undefined，回退到 HOME_PAGE）
  const final = urlWithQuery || HOME_PAGE
  uni.navigateTo({ url: final })
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
    console.log('checkRoutePermission permissionStore.isInitialized:', permissionStore.isInitialized)
    if (!permissionStore.isInitialized) {
      return { allowed: true }
    }

    const currentRole = permissionStore.currentRole || UserRole.GUEST

    console.log('checkRoutePermission currentRole:', currentRole)
    console.log('checkRoutePermission path:', path)
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
  } catch (error) {
    console.error('路由权限检查失败:', error)
    // 出错时允许访问，避免阻塞用户
    return { allowed: true }
  }
}

export const navigateToInterceptor = {
  // 注意，这里的url是 '/' 开头的，如 '/pages/index/index'，跟 'pages.json' 里面的 path 不同
  // 增加对相对路径的处理，BY 网友 @ideal
  // 增强版：集成多角色权限管理系统
  async invoke({ url, query }: { url: string; query?: Record<string, string> }) {
    if (url === undefined) {
      console.warn('路由拦截器: URL参数为undefined，阻止导航')
      return false
    }

    return await handleRouteNavigation(url, query)
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
  tabBarStore.setAutoCurIdx(path)

  // 小程序里面使用平台自带的登录，则不走下面的逻辑
  console.log('isMp && !LOGIN_PAGE_ENABLE_IN_MP:', isMp && !LOGIN_PAGE_ENABLE_IN_MP)
  if (isMp && !LOGIN_PAGE_ENABLE_IN_MP) {
    console.log('小程序里面使用平台自带的登录，不走登录逻辑')
    return true
  }

  // 执行增强版权限检查
  const permissionResult = await checkRoutePermission(path)
  console.log('handleRouteNavigation permissionResult:', permissionResult)
  if (!permissionResult.allowed) {
    return handlePermissionDenied(permissionResult, path, myQuery)
  }

  // 执行传统登录检查（向后兼容）
  return await checkLoginPermission(path, myQuery)
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
  permissionResult: { redirectUrl?: string; message?: string },
  originalPath: string,
  query: Record<string, string>
): boolean {
  const redirectUrl = permissionResult.redirectUrl || LOGIN_PAGE || HOME_PAGE

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

  console.log('handlePermissionDenied finalRedirectUrl:', finalRedirectUrl)
  console.log(
    'handlePermissionDenied isPageTabBar(redirectUrl):',
    isPageTabBar(redirectUrl),
    'originalPath:',
    originalPath,
    'redirectUrl:',
    redirectUrl
  )
  const switchPath = extractPathForSwitch(redirectUrl)
  console.log(
    'handlePermissionDenied isPageTabBar(redirectUrl):',
    isPageTabBar(switchPath || ''),
    'originalPath:',
    originalPath,
    'redirectUrl:',
    redirectUrl
  )

  safeNavigate(redirectUrl ? finalRedirectUrl : HOME_PAGE)

  return false
}

/**
 * 传统登录权限检查（向后兼容）
 */
async function checkLoginPermission(path: string, myQuery: Record<string, string>): Promise<boolean> {
  const tokenStore = useTokenStore()
  console.log('checkLoginPermission tokenStore.hasLogin:', tokenStore.hasLogin)

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
  if (!targetUrl) {
    uni.navigateTo({ url: HOME_PAGE })
    return false
  }

  safeNavigate(targetUrl)
  return false
}
/**
 * 处理未登录用户
 */
function handleNotLoggedInUser(path: string, myQuery: Record<string, string>): boolean {
  let fullPath = path
  console.log('handleNotLoggedInUser myQuery:', myQuery)
  console.log('handleNotLoggedInUser fullPath:', fullPath)

  if (Object.keys(myQuery).length) {
    const queryString = Object.keys(myQuery)
      .map(key => `${key}=${myQuery[key]}`)
      .join('&')
    fullPath += `?${queryString}`
  }

  const redirectUrl = `${LOGIN_PAGE || HOME_PAGE}?redirect=${encodeURIComponent(fullPath)}`

  // #region 1/2 默认需要登录的情况(白名单策略) ---------------------------
  console.log('handleNotLoggedInUser isNeedLoginMode:', isNeedLoginMode)
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
    safeNavigate(redirectUrl)
    return false
  }
  // #endregion 1/2 默认需要登录的情况(白名单策略) ---------------------------

  // #region 2/2 默认不需要登录的情况(黑名单策略) ---------------------------
  // 不需要登录里面的 EXCLUDE_LOGIN_PATH_LIST 表示黑名单，需要重定向到登录页

  console.log('handleNotLoggedInUser judgeIsExcludePath(path):', judgeIsExcludePath(path))
  if (judgeIsExcludePath(path)) {
    LOG_ENABLE && console.log('2 isNeedLogin(黑名单策略) redirectUrl:', redirectUrl)
    safeNavigate(redirectUrl)
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

    // 在小程序环境下，如果不使用H5登录页，则不拦截switchTab
    // 这样可以避免异步拦截器导致的参数传递问题
    if (!(isMp && !LOGIN_PAGE_ENABLE_IN_MP)) {
      uni.addInterceptor('switchTab', navigateToInterceptor)
    }
  },
}
