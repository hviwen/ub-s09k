import type { CustomTabBarItem, CustomTabBarItemBadge } from './config'
import { reactive } from 'vue'

import { LOG_ENABLE } from '@/router/interceptor'
import { tabBarList as _tabBarList, customTabBarEnable } from './config'

// 中间鼓包 tabbarItem 的开关（默认关闭）
const BULGE_ENABLE = false

/** tabBarList 里面的 path 从 pages.config.ts 得到 */
const tabBarList = reactive<CustomTabBarItem[]>(
  _tabBarList.map(item => ({
    ...item,
    pagePath: item.pagePath.startsWith('/') ? item.pagePath : `/${item.pagePath}`,
  }))
)

if (customTabBarEnable && BULGE_ENABLE) {
  if (tabBarList.length % 2) {
    console.error('有鼓包时 tabbar 数量必须是偶数，否则样式很奇怪！！')
  }
  tabBarList.splice(tabBarList.length / 2, 0, {
    isBulge: true,
  } as CustomTabBarItem)
}

export function isPageTabBar(path: string) {
  const _path = path.split('?')[0]
  return tabBarList.some(item => item.pagePath === _path)
}

/**
 * 自定义 tabbar 的状态管理，原生 tabbar 无需关注本文件
 * tabbar 状态，增加 storageSync 保证刷新浏览器时在正确的 tabbar 页面
 * 使用reactive简单状态，而不是 pinia 全局状态
 */
const tabBarStore = reactive({
  curIdx: uni.getStorageSync('app-tabbar-index') || 0,
  prevIdx: uni.getStorageSync('app-tabbar-index') || 0,
  setCurIdx(idx: number) {
    this.curIdx = idx
    uni.setStorageSync('app-tabbar-index', idx)
  },
  setTabBarItemBadge(idx: number, badge: CustomTabBarItemBadge) {
    if (tabBarList[idx]) {
      tabBarList[idx].badge = badge
    }
  },
  setAutoCurIdx(path: string) {
    const index = tabBarList.findIndex(item => item.pagePath === path)
    LOG_ENABLE && console.log('index:', index, path, tabBarList)
    if (index === -1) {
      const pagesPathList = getCurrentPages().map(item => (item.route.startsWith('/') ? item.route : `/${item.route}`))
      console.log('pagesPathList', pagesPathList)
      const flag = tabBarList.some(item => pagesPathList.includes(item.pagePath))
      if (!flag) {
        this.setCurIdx(0)
        return
      }
    } else {
      this.setCurIdx(index)
    }
  },
  restorePrevIdx() {
    if (this.prevIdx === this.curIdx) return
    this.setCurIdx(this.prevIdx)
    this.prevIdx = uni.getStorageSync('app-tabbar-index') || 0
  },
})

export { tabBarList, tabBarStore }
