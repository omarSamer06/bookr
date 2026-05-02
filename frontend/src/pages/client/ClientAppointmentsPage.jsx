import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import AppointmentCard from '@/components/booking/AppointmentCard'
import RescheduleModal from '@/components/booking/RescheduleModal'
import { buttonVariants } from '@/components/ui/button'
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

/** Client hub for post-booking actions with query params matching the API contract */
export default function ClientAppointmentsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('all')
  const [rescheduleTarget, setRescheduleTarget] = useState(null)

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
      return <p className="text-sm text-muted-foreground">Loading appointments…</p>
    }
    if (isError) {
      return <p className="text-sm text-destructive">{error?.message}</p>
    }
    if (rows.mode === 'flat') {
      if (!rows.list.length) {
        return <p className="text-sm text-muted-foreground">Nothing cancelled yet.</p>
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
            />
          ))}
        </div>
      )
    }

    return (
      <>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Upcoming</h2>
          {!rows.upcoming.length ? (
            <p className="text-sm text-muted-foreground">No upcoming appointments in this view.</p>
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
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Past</h2>
          {!rows.past.length ? (
            <p className="text-sm text-muted-foreground">No past appointments in this view.</p>
          ) : (
            <div className="grid gap-4">
              {rows.past.map((appt) => (
                <AppointmentCard
                  key={appt._id}
                  appointment={appt}
                  viewType="client"
                  notificationsHref={`/notifications?appointmentId=${appt._id}`}
                />
              ))}
            </div>
          )}
        </section>
      </>
    )
  })()

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to dashboard
      </Link>

      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">My appointments</h1>
        <p className="mt-2 text-sm text-muted-foreground">Upcoming visits stay grouped — history falls below automatically.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
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

      <Link to="/businesses" className={cn(buttonVariants({ variant: 'secondary' }), 'inline-flex')}>
        Book another business
      </Link>

      <RescheduleModal
        open={Boolean(rescheduleTarget)}
        onOpenChange={(open) => {
          if (!open) setRescheduleTarget(null)
        }}
        appointment={rescheduleTarget}
      />
    </div>
  )
}
