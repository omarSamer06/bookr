import { Bell, CalendarDays, CheckCircle2, MessageSquare, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { cn } from '@/lib/utils'

/** Maps server enums to chroma so operators can scan failures without reading copy */
const typeIcon = {
  confirmation: { Icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400' },
  cancellation: { Icon: XCircle, className: 'text-red-600 dark:text-red-400' },
  reminder: { Icon: Bell, className: 'text-amber-600 dark:text-amber-400' },
  reschedule: { Icon: CalendarDays, className: 'text-sky-600 dark:text-sky-400' },
  custom: { Icon: MessageSquare, className: 'text-muted-foreground' },
}

/** Single inbox row shared by the full page and any future compact surfaces */
export default function NotificationItem({ notification }) {
  const { Icon, className: iconClass } = typeIcon[notification.type] ?? typeIcon.custom
  const failed = notification.status === 'failed'

  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border border-border/60 p-4 transition-colors',
        failed ? 'bg-destructive/6' : 'bg-card'
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <Icon className={cn('size-5', iconClass)} aria-hidden />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
            {notification.channel === 'sms' ? 'SMS' : 'Email'}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] capitalize',
              notification.status === 'sent'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                : 'border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200'
            )}
          >
            {notification.status}
          </Badge>
        </div>

        <div>
          <p className="font-medium text-foreground">{notification.subject || 'Notification'}</p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{notification.message}</p>
        </div>

        <p className="text-xs text-muted-foreground">{formatRelativeTime(notification.sentAt)}</p>
      </div>
    </div>
  )
}
