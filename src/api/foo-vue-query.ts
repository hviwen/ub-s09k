import { queryOptions } from '@tanstack/vue-query'
import { getFooAPI } from './foo'

export function getFooQueryOptions(name: string) {
  return queryOptions({
    queryFn: async ({ queryKey }) => {
      console.log('getFooQueryOptions: ', queryKey)
      return new Promise(resolve => {
        setTimeout(() => resolve(getFooAPI(queryKey[1])), 2000)
      })
    },
    queryKey: ['getFoo', name],
  })
}
