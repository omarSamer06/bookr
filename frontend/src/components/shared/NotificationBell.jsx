import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotificationStore } from '@/store/notificationStore'
import { cn } from '@/lib/utils'

/** Bell doubles as a lightweight “mark attention handled” control because inbox has no read receipts yet */
export default function NotificationBell() {
  const navigate = useNavigate()
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const clearUnread = useNotificationStore((s) => s.clearUnread)

  const onClick = () => {
    clearUnread()
    navigate('/notifications')
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative size-10 shrink-0 rounded-full text-indigo-700 hover:bg-indigo-50"
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} recent` : 'Notifications'}
      onClick={onClick}
    >
      <Bell className="size-5" aria-hidden />
      {unreadCount > 0 ? (
        <span
          className={cn(
            'absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1',
            'bg-gradient-to-r from-indigo-500 to-purple-600 text-[10px] font-bold text-white shadow-sm'
          )}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </Button>
  )
}
