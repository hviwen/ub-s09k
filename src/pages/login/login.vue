<script lang="ts" setup>
  import { useTokenStore } from '@/store/token'
  import { useUserStore } from '@/store/user'
  import { tabBarList } from '@/tabbar/config'
  import { isPageTabBar } from '@/tabbar/store'
  import { ensureDecodeURIComponent } from '@/utils'
  import { parseUrlToObj } from '@/utils/index'
  import { getWxCode, wxLogin as _wxLogin } from '@/api/login'

  definePage({
    style: {
      navigationBarTitleText: '登录',
    },
  })

  const redirectUrl = ref('')
  onLoad(options => {
    console.log('login options: ', options)
    if (options.redirect) {
      redirectUrl.value = ensureDecodeURIComponent(options.redirect)
    } else {
      redirectUrl.value = tabBarList[0].pagePath
    }
    console.log('redirectUrl.value: ', redirectUrl.value)
  })

  const loading = ref(false)

  const userStore = useUserStore()
  const tokenStore = useTokenStore()
  async function doLogin() {
    if (tokenStore.hasLogin) {
      uni.navigateBack()
      return
    }
    try {
      // 1/2 调用接口回来后设置用户信息
      // const res = await login({
      //   username: '菲鸽',
      //   password: '123456',
      // })
      // console.log('接口拿到的登录信息：', res)
      userStore.setUserInfo({
        userId: 123456,
        username: 'abc123456',
        nickname: '菲鸽',
        avatar: 'https://oss.laf.run/ukw0y1-site/avatar.jpg',
      })
      // 2/2 调用接口回来后设置token信息
      // 这里用单token来模拟
      tokenStore.setTokenInfo({
        token: '123456',
        expiresIn: 60 * 60 * 24 * 7,
      })
      console.log(redirectUrl.value)
    } catch (error) {
      console.log('登录失败', error)
    }
    let path = redirectUrl.value
    if (!path.startsWith('/')) {
      path = `/${path}`
    }
    const { path: _path, query } = parseUrlToObj(path)
    console.log('_path:', _path, 'query:', query, 'path:', path)
    console.log('isPageTabBar(_path):', isPageTabBar(_path))
    if (isPageTabBar(_path)) {
      // 经过我的测试 switchTab 不能带 query 参数, 不管是放到 url  还是放到 query ,
      // 最后跳转过去的时候都会丢失 query 信息
      uni.switchTab({
        url: path,
      })
      // uni.switchTab({
      //   url: _path,
      //   query,
      // })
    } else {
      console.log('redirectTo:', path)
      uni.redirectTo({
        url: path,
      })
    }
  }

  async function getPhoneNumber(e: any) {
    console.log('getPhoneNumber:', e)
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      uni.showToast({
        title: '未授权手机号，已取消登录操作',
        icon: 'none',
        duration: 2000,
      })
      return
    }

    try {
      loading.value = true
      const { code } = await getWxCode()
      console.log('获取登录凭证code成功！', code)
      const res = await _wxLogin({ code })
      console.log('微信登录-res: ', res)
    } catch (err) {
      uni.showToast({
        title: '登录失败，请重试',
        icon: 'none',
        duration: 2000,
      })
      console.error('登录流程出错:', err)
    } finally {
      loading.value = false
    }
  }

  async function checkLogin() {
    console.log('checkLogin')
    try {
      loading.value = true
      const { code } = await getWxCode()
      console.log('获取登录凭证code成功！', code)
      const res = await _wxLogin({ code })
      console.log('微信登录-res: ', res)
    } catch (err) {
      uni.showToast({
        title: '登录失败，请重试',
        icon: 'none',
        duration: 2000,
      })
      console.error('登录流程出错:', err)
    } finally {
      loading.value = false
    }
  }
</script>

<template>
  <view class="login">
    <!-- 本页面是非MP的登录页，主要用于 h5 和 APP -->
    <view class="text-center"> 登录页 {{ redirectUrl }} </view>
    <button class="mt-4 w-40 text-center" @click="checkLogin">点击模拟登录</button>
  </view>
</template>

<style lang="scss" scoped>
  //
</style>
