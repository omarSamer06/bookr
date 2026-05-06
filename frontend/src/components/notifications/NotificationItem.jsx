import { Bell, CalendarDays, CheckCircle2, MessageSquare, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { cn } from '@/lib/utils'

/** Maps server enums to chroma so operators can scan failures without reading copy */
const typeIcon = {
  confirmation: { Icon: CheckCircle2, className: 'text-emerald-600' },
  cancellation: { Icon: XCircle, className: 'text-red-600' },
  reminder: { Icon: Bell, className: 'text-amber-600' },
  reschedule: { Icon: CalendarDays, className: 'text-indigo-600' },
  custom: { Icon: MessageSquare, className: 'text-bookr-muted' },
}

/** Single inbox row shared by the full page and any future compact surfaces */
export default function NotificationItem({ notification }) {
  const { Icon, className: iconClass } = typeIcon[notification.type] ?? typeIcon.custom
  const failed = notification.status === 'failed'

  return (
    <div
      className={cn(
        'flex gap-4 rounded-2xl border p-5 shadow-sm transition-colors',
        failed ? 'border-red-200 bg-red-50/60' : 'border-gray-100 bg-white hover:border-indigo-100 hover:shadow-md'
      )}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100/80">
        <Icon className={cn('size-5', iconClass)} aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-heading font-bold text-bookr-text">{notification.subject || 'Notification'}</p>
            <p className="line-clamp-2 text-sm leading-relaxed text-bookr-muted">{notification.message}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex flex-wrap justify-end gap-2">
              <Badge variant="outline" className="rounded-full border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-bookr-muted">
                {notification.channel === 'sms' ? 'SMS' : 'Email'}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full px-3 py-1 text-[10px] font-semibold capitalize',
                  notification.status === 'sent'
                    ? 'border-0 bg-emerald-100 text-emerald-800'
                    : 'border-0 bg-red-100 text-red-800'
                )}
              >
                {notification.status}
              </Badge>
            </div>
            <p className="text-xs font-medium text-bookr-muted">{formatRelativeTime(notification.sentAt)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
