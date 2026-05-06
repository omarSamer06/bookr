import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
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
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="size-11 shrink-0 animate-pulse rounded-xl bg-gray-100" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex gap-2">
              <div className="h-6 w-14 animate-pulse rounded-full bg-gray-100" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-gray-100" />
            </div>
            <div className="h-5 w-56 max-w-full animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-full max-w-lg animate-pulse rounded bg-gray-50" />
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
      appointmentFilter ? getAppointmentNotifications(appointmentFilter) : getMyNotifications(),
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
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/60">
            <Bell className="size-6" aria-hidden />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-bookr-text">Notifications</h1>
            <p className="mt-2 text-sm leading-relaxed text-bookr-muted">
              {appointmentFilter
                ? 'Filtered to this appointment’s delivery timeline.'
                : 'Email and SMS attempts for your bookings, newest first.'}
            </p>
          </div>
        </div>
        {appointmentFilter ? (
          <Link to="/notifications" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'shrink-0 border-gray-200')}>
            Clear filter
          </Link>
        ) : null}
      </div>

      {isLoading ? <NotificationsSkeleton /> : null}

      {!isLoading && isError ? (
        <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/50 px-6 py-12 text-center text-sm font-medium text-red-700">
          {error?.message ?? 'Could not load notifications.'}
        </div>
      ) : null}

      {!isLoading && !isError && !notifications.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-20 text-center shadow-sm">
          <span className="flex size-20 items-center justify-center rounded-full bg-indigo-50 text-indigo-400">
            <Bell className="size-10" aria-hidden />
          </span>
          <p className="mt-6 font-heading text-xl font-bold text-bookr-text">No notifications yet</p>
          <p className="mt-2 max-w-sm text-sm text-bookr-muted">
            When bookings confirm, cancel, or need a reminder, they will show up here.
          </p>
        </div>
      ) : null}

      {!isLoading && !isError && notifications.length ? (
        <div className="space-y-12">
          {sections.map(({ key, title }) =>
            grouped[key].length ? (
              <section key={key} className="space-y-4">
                <h2 className="sticky top-0 z-10 -mx-1 bg-bookr-warm/95 px-1 py-2 text-xs font-bold tracking-wide text-bookr-muted uppercase backdrop-blur-sm">
                  {title}
                </h2>
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
