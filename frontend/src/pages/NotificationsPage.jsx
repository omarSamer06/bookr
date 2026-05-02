import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Inbox } from 'lucide-react'
import NotificationItem from '@/components/notifications/NotificationItem'
import { buttonVariants } from '@/components/ui/button'
import useAuth from '@/hooks/useAuth'
import { getNotificationDayBucket } from '@/lib/notificationGrouping'
import {
  getAppointmentNotifications,
  getMyNotifications,
  notificationQueryKeys,
} from '@/services/notification.service.js'
import { cn } from '@/lib/utils'

/** Skeleton mirrors row rhythm so layout doesn’t jump when real rows stream in */
function NotificationsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-xl border border-border/50 p-4">
          <div className="size-10 shrink-0 animate-pulse rounded-lg bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="h-5 w-14 animate-pulse rounded-md bg-muted" />
              <div className="h-5 w-16 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="h-4 w-[60%] max-w-md animate-pulse rounded bg-muted" />
            <div className="h-3 w-full max-w-lg animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Full inbox with optional appointment filter for deep links from booking cards */
export default function NotificationsPage() {
  const { user } = useAuth()
  const userId = user?._id ?? user?.id
  const [params] = useSearchParams()
  const rawAppointmentId = params.get('appointmentId')?.trim() ?? ''
  const appointmentFilter = /^[a-f\d]{24}$/i.test(rawAppointmentId) ? rawAppointmentId : ''

  const { data: notifications = [], isLoading, isError, error } = useQuery({
    queryKey: appointmentFilter
      ? notificationQueryKeys.appointment(appointmentFilter)
      : notificationQueryKeys.mine(userId ?? 'anon'),
    queryFn: () =>
      appointmentFilter
        ? getAppointmentNotifications(appointmentFilter)
        : getMyNotifications(),
    enabled: appointmentFilter ? true : Boolean(userId),
    staleTime: 30 * 1000,
  })

  const grouped = useMemo(() => {
    const buckets = { today: [], yesterday: [], earlier: [] }
    for (const n of notifications) {
      const b = getNotificationDayBucket(n.sentAt)
      buckets[b].push(n)
    }
    return buckets
  }, [notifications])

  const sections = [
    { key: 'today', title: 'Today' },
    { key: 'yesterday', title: 'Yesterday' },
    { key: 'earlier', title: 'Earlier' },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {appointmentFilter
              ? 'Filtered to this appointment’s delivery timeline.'
              : 'Email and SMS attempts for your bookings, newest first.'}
          </p>
        </div>
        {appointmentFilter ? (
          <Link to="/notifications" className={cn(buttonVariants({ variant: 'outline' }), 'shrink-0')}>
            Clear filter
          </Link>
        ) : null}
      </div>

      {isLoading ? <NotificationsSkeleton /> : null}

      {!isLoading && isError ? (
        <p className="text-sm text-destructive">{error?.message ?? 'Could not load notifications.'}</p>
      ) : null}

      {!isLoading && !isError && !notifications.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-16 text-center">
          <Inbox className="mb-3 size-10 text-muted-foreground" aria-hidden />
          <p className="font-medium text-foreground">No notifications yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            When bookings confirm, cancel, or need a reminder, they will show up here.
          </p>
        </div>
      ) : null}

      {!isLoading && !isError && notifications.length ? (
        <div className="space-y-10">
          {sections.map(({ key, title }) =>
            grouped[key].length ? (
              <section key={key} className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
                <div className="space-y-3">
                  {grouped[key].map((n) => (
                    <NotificationItem key={n._id} notification={n} />
                  ))}
                </div>
              </section>
            ) : null
          )}
        </div>
      ) : null}
    </div>
  )
}
