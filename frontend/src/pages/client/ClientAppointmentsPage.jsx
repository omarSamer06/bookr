import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import AppointmentCard from '@/components/booking/AppointmentCard'
import RescheduleModal from '@/components/booking/RescheduleModal'
import ReviewForm from '@/components/reviews/ReviewForm'
import { buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { parseAppointmentStartUtc } from '@/lib/bookingUtils'
import { cn } from '@/lib/utils'
import {
  appointmentQueryKeys,
  cancelAppointment,
  getMyAppointments,
} from '@/services/appointment.service.js'

/** Splits rendered groups by start instant so “upcoming” isn’t ambiguous across timezones */
function partitionUpcomingPast(list) {
  const now = Date.now()
  const upcoming = []
  const past = []
  for (const appt of list) {
    const start = parseAppointmentStartUtc(appt)
    const t = start.getTime()
    if (!Number.isFinite(t)) {
      past.push(appt)
      continue
    }
    if (t >= now) upcoming.push(appt)
    else past.push(appt)
  }

  upcoming.sort(
    (a, b) => parseAppointmentStartUtc(a).getTime() - parseAppointmentStartUtc(b).getTime()
  )
  past.sort((a, b) => parseAppointmentStartUtc(b).getTime() - parseAppointmentStartUtc(a).getTime())
  return { upcoming, past }
}

function AppointmentsSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="w-1 shrink-0 rounded-full bg-gray-100" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-5 w-48 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-full max-w-md animate-pulse rounded bg-gray-50" />
            <div className="flex gap-2">
              <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-gray-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Client hub for post-booking actions with query params matching the API contract */
export default function ClientAppointmentsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('all')
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [reviewTarget, setReviewTarget] = useState(null)

  const filters = useMemo(() => {
    if (tab === 'upcoming') return { upcoming: true }
    if (tab === 'cancelled') return { status: 'cancelled' }
    return {}
  }, [tab])

  const { data: appointments = [], isLoading, isError, error } = useQuery({
    queryKey: appointmentQueryKeys.mine(filters),
    queryFn: () => getMyAppointments(filters),
    staleTime: 30 * 1000,
  })

  const rows = useMemo(() => {
    if (tab === 'cancelled') {
      return { mode: 'flat', list: appointments }
    }
    let source = appointments
    if (tab === 'upcoming') {
      source = appointments.filter((a) => a.status !== 'cancelled')
    }
    return { mode: 'split', ...partitionUpcomingPast(source) }
  }, [appointments, tab])

  const summaryChips = useMemo(() => {
    if (tab !== 'all' || isLoading || isError) return null
    const total = appointments.length
    const nonCancelled = appointments.filter((a) => a.status !== 'cancelled')
    const { upcoming } = partitionUpcomingPast(nonCancelled)
    const cancelled = appointments.filter((a) => a.status === 'cancelled').length
    return { total, upcoming: upcoming.length, cancelled }
  }, [appointments, tab, isLoading, isError])

  const cancelMutation = useMutation({
    mutationFn: (id) => cancelAppointment(id),
    onSuccess: async () => {
      toast.success('Appointment cancelled')
      await qc.invalidateQueries({ queryKey: ['appointments', 'mine'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const panel = (() => {
    if (isLoading) {
      return <AppointmentsSkeleton />
    }
    if (isError) {
      return (
        <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/50 px-6 py-12 text-center text-sm font-medium text-red-700">
          {error?.message}
        </div>
      )
    }
    if (rows.mode === 'flat') {
      if (!rows.list.length) {
        return (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
            <p className="font-heading text-lg font-bold text-bookr-text">Nothing cancelled yet</p>
            <p className="mt-2 max-w-sm text-sm text-bookr-muted">Cancelled appointments will appear in this tab.</p>
          </div>
        )
      }
      return (
        <div className="grid gap-4">
          {rows.list.map((appt) => (
            <AppointmentCard
              key={appt._id}
              appointment={appt}
              viewType="client"
              notificationsHref={`/notifications?appointmentId=${appt._id}`}
              onCancel={() => cancelMutation.mutate(appt._id)}
              onReschedule={() => setRescheduleTarget(appt)}
              onLeaveReview={() => setReviewTarget(appt)}
            />
          ))}
        </div>
      )
    }

    return (
      <>
        <section className="space-y-4">
          <h2 className="text-xs font-bold tracking-wide text-bookr-muted uppercase">Upcoming</h2>
          {!rows.upcoming.length ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-bookr-muted shadow-sm">
              No upcoming appointments in this view.
            </div>
          ) : (
            <div className="grid gap-4">
              {rows.upcoming.map((appt) => (
                <AppointmentCard
                  key={appt._id}
                  appointment={appt}
                  viewType="client"
                  notificationsHref={`/notifications?appointmentId=${appt._id}`}
                  onCancel={() => cancelMutation.mutate(appt._id)}
                  onReschedule={() => setRescheduleTarget(appt)}
                  onLeaveReview={() => setReviewTarget(appt)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-bold tracking-wide text-bookr-muted uppercase">Past</h2>
          {!rows.past.length ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-bookr-muted shadow-sm">
              No past appointments in this view.
            </div>
          ) : (
            <div className="grid gap-4">
              {rows.past.map((appt) => (
                <AppointmentCard
                  key={appt._id}
                  appointment={appt}
                  viewType="client"
                  notificationsHref={`/notifications?appointmentId=${appt._id}`}
                  onLeaveReview={() => setReviewTarget(appt)}
                />
              ))}
            </div>
          )}
        </section>
      </>
    )
  })()

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-bookr-text sm:text-4xl">My appointments</h1>
          <p className="mt-2 text-sm leading-relaxed text-bookr-muted sm:text-base">
            Upcoming visits stay grouped — history falls below automatically.
          </p>
        </div>

        {summaryChips ? (
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-bookr-text shadow-sm">
              Total <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-800">{summaryChips.total}</span>
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-bookr-text shadow-sm">
              Upcoming{' '}
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">{summaryChips.upcoming}</span>
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-bookr-text shadow-sm">
              Cancelled{' '}
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-red-800">{summaryChips.cancelled}</span>
            </span>
          </div>
        ) : null}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList variant="line" className="w-full justify-start overflow-x-auto border-b border-gray-100">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {tab === 'all' ? panel : null}
        </TabsContent>
        <TabsContent value="upcoming" className="space-y-6">
          {tab === 'upcoming' ? panel : null}
        </TabsContent>
        <TabsContent value="cancelled" className="space-y-6">
          {tab === 'cancelled' ? panel : null}
        </TabsContent>
      </Tabs>

      <Link
        to="/businesses"
        className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'inline-flex border-indigo-200 text-indigo-700 hover:bg-indigo-50')}
      >
        Book another business
      </Link>

      <RescheduleModal
        open={Boolean(rescheduleTarget)}
        onOpenChange={(open) => {
          if (!open) setRescheduleTarget(null)
        }}
        appointment={rescheduleTarget}
      />

      <Dialog
        open={Boolean(reviewTarget)}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave a review</DialogTitle>
          </DialogHeader>
          {reviewTarget ? (
            <ReviewForm
              appointmentId={reviewTarget._id}
              businessName={reviewTarget.business?.name ?? 'this business'}
              onSuccess={async () => {
                setReviewTarget(null)
                await qc.invalidateQueries({ queryKey: ['appointments', 'mine'] })
                if (reviewTarget.business?._id) {
                  await qc.invalidateQueries({
                    queryKey: ['reviews', 'business', reviewTarget.business._id],
                  })
                  await qc.invalidateQueries({
                    queryKey: ['businesses', 'detail', reviewTarget.business._id],
                  })
                }
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
