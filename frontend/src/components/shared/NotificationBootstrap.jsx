import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import useAuth from '@/hooks/useAuth'
import { countRecentNotifications } from '@/lib/notificationUnread'
import { getMyNotifications, notificationQueryKeys } from '@/services/notification.service.js'
import { useNotificationStore } from '@/store/notificationStore'

/** Prefetches the mine query for the inbox route while syncing the bell badge from the same cache */
export default function NotificationBootstrap() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)
  const userId = user?._id ?? user?.id

  const { data } = useQuery({
    queryKey: notificationQueryKeys.mine(userId ?? 'anon'),
    queryFn: getMyNotifications,
    enabled: Boolean(userId) && !isLoading && isAuthenticated,
    staleTime: 30 * 1000,
  })

  useEffect(() => {
    if (!isAuthenticated || isLoading) {
      setUnreadCount(0)
      return
    }
    if (!data) return
    setUnreadCount(countRecentNotifications(data))
  }, [isAuthenticated, isLoading, data, setUnreadCount])

  return null
}
