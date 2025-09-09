import type { IUserInfoRes } from '@/api/types/login'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getUserInfo,
} from '@/api/login'
import { usePermissionStore } from '@/permission/store/permissionStore'
import { UserRole } from '@/permission/types'

// 初始化状态
const userInfoState: IUserInfoRes = {
  userId: -1,
  username: '',
  nickname: '',
  avatar: '/static/images/default-avatar.png',
}

export const useUserStore = defineStore(
  'user',
  () => {
    // 定义用户信息
    const userInfo = ref<IUserInfoRes>({ ...userInfoState })
    // 设置用户信息
    const setUserInfo = (val: IUserInfoRes) => {
      console.log('设置用户信息', val)
      // 若头像为空 则使用默认头像
      if (!val.avatar) {
        val.avatar = userInfoState.avatar
      }
      userInfo.value = val
    }
    const setUserAvatar = (avatar: string) => {
      userInfo.value.avatar = avatar
      console.log('设置用户头像', avatar)
      console.log('userInfo', userInfo.value)
    }
    // 删除用户信息
    const clearUserInfo = () => {
      userInfo.value = { ...userInfoState }
      uni.removeStorageSync('user')

      // 重置权限状态
      const permissionStore = usePermissionStore()
      permissionStore.resetPermissionState()
    }

    /**
     * 获取用户信息
     */
    const fetchUserInfo = async () => {
      const res = await getUserInfo()
      setUserInfo(res.data)

      // 初始化权限系统
      const permissionStore = usePermissionStore()
      if (res.data.userId && !permissionStore.isInitialized) {
        try {
          await permissionStore.initializePermissionSystem(res.data.userId)

          // 根据用户信息设置角色
          await initializeUserRole(res.data)
        }
        catch (error) {
          console.error('初始化权限系统失败:', error)
        }
      }

      return res
    }

    /**
     * 根据用户信息初始化角色
     */
    const initializeUserRole = async (userInfo: IUserInfoRes) => {
      const permissionStore = usePermissionStore()

      // 这里可以根据后端返回的用户信息来确定用户角色
      // 示例：根据用户类型字段设置角色
      let userRole = UserRole.REGULAR // 默认为普通用户

      // 根据用户信息中的角色字段设置角色（需要后端支持）
      if (userInfo.role) {
        switch (userInfo.role) {
          case 'channel':
            userRole = UserRole.CHANNEL
            break
          case 'institutional':
            userRole = UserRole.INSTITUTIONAL
            break
          case 'admin':
            userRole = UserRole.ADMIN
            break
          default:
            userRole = UserRole.REGULAR
        }
      }

      // 创建角色对象
      const role = {
        id: `${userRole}_${userInfo.userId}`,
        type: userRole,
        name: getRoleName(userRole),
        description: getRoleDescription(userRole),
        permissions: [], // 权限将由权限系统管理
        status: 'active' as any,
        createdAt: Date.now(),
      }

      // 添加用户角色
      await permissionStore.addUserRole(role)

      // 如果当前是游客角色，切换到新角色
      if (permissionStore.currentRole === UserRole.GUEST) {
        await permissionStore.switchRole(userRole, '用户登录自动切换')
      }
    }

    /**
     * 获取角色名称
     */
    const getRoleName = (role: UserRole): string => {
      switch (role) {
        case UserRole.GUEST:
          return '游客'
        case UserRole.REGULAR:
          return '普通用户'
        case UserRole.CHANNEL:
          return '渠道用户'
        case UserRole.INSTITUTIONAL:
          return '机构用户'
        case UserRole.ADMIN:
          return '管理员'
        default:
          return '未知角色'
      }
    }

    /**
     * 获取角色描述
     */
    const getRoleDescription = (role: UserRole): string => {
      switch (role) {
        case UserRole.GUEST:
          return '未登录用户，权限受限'
        case UserRole.REGULAR:
          return '已登录的普通用户，可查看和分享内容'
        case UserRole.CHANNEL:
          return '渠道用户，可下载和创建内容'
        case UserRole.INSTITUTIONAL:
          return '机构用户，拥有高级权限'
        case UserRole.ADMIN:
          return '系统管理员，拥有所有权限'
        default:
          return '角色描述未定义'
      }
    }

    return {
      userInfo,
      clearUserInfo,
      fetchUserInfo,
      setUserInfo,
      setUserAvatar,
      initializeUserRole,
      getRoleName,
      getRoleDescription,
    }
  },
  {
    persist: true,
  },
)
