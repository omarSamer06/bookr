import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarClock, Mail, MapPin, User } from 'lucide-react'
import { isAppointmentFuture, parseAppointmentStartUtc } from '@/lib/bookingUtils'
import { cn } from '@/lib/utils'

/** Turns UTC-backed timestamps into locale strings without leaking TZ assumptions to parents */
function formatAppointmentWhen(appointment) {
  const start = parseAppointmentStartUtc(appointment)
  if (!Number.isFinite(start.getTime())) return `${appointment?.startTime ?? ''}`
  return start.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Money badges stay independent from scheduling badges so refunds don’t collide visually */
function PaymentStatusBadge({ paymentStatus }) {
  const ps = paymentStatus || 'unpaid'
  const styles = {
    unpaid: 'border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300',
    paid: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    refunded: 'border-muted-foreground/40 bg-muted text-muted-foreground',
  }

  const label = ps === 'unpaid' ? 'Unpaid' : ps === 'paid' ? 'Paid' : ps === 'refunded' ? 'Refunded' : ps

  return (
    <Badge variant="outline" className={cn('capitalize', styles[ps] ?? styles.unpaid)}>
      {label}
    </Badge>
  )
}

/** Centralizes badge chroma so owners + clients read risk consistently */
function StatusBadge({ status }) {
  const styles = {
    pending: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    confirmed: 'border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    completed: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    cancelled: 'border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300',
    'no-show': 'border-muted-foreground/40 bg-muted text-muted-foreground',
  }

  const label = status === 'no-show' ? 'No-show' : status

  return (
    <Badge variant="outline" className={cn('capitalize', styles[status] ?? '')}>
      {label}
    </Badge>
  )
}

/** Shared appointment chrome avoids drifting layouts between dashboards */
export default function AppointmentCard({
  appointment,
  viewType = 'client',
  onCancel,
  onReschedule,
  onConfirm,
  onComplete,
  onNoShow,
  onRefund,
}) {
  const future = isAppointmentFuture(appointment)
  const status = appointment.status

  const title =
    viewType === 'owner'
      ? appointment.client?.name ?? 'Client'
      : appointment.business?.name ?? 'Business'

  const subtitle =
    viewType === 'owner' ? (
      <span className="inline-flex items-center gap-1">
        <Mail className="size-3.5 text-muted-foreground" aria-hidden />
        {appointment.client?.email ?? '—'}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1">
        <MapPin className="size-3.5 text-muted-foreground" aria-hidden />
        {[appointment.business?.location?.city, appointment.business?.location?.country]
          .filter(Boolean)
          .join(' · ') || 'Location TBD'}
      </span>
    )

  const showClientCancel =
    viewType === 'client' &&
    Boolean(onCancel) &&
    (status === 'pending' || status === 'confirmed') &&
    future

  const showClientReschedule =
    viewType === 'client' && Boolean(onReschedule) && status === 'pending' && future

  const showOwnerConfirm = viewType === 'owner' && Boolean(onConfirm) && status === 'pending'

  const showOwnerComplete = viewType === 'owner' && Boolean(onComplete) && status === 'confirmed'

  const showOwnerNoShow =
    viewType === 'owner' && Boolean(onNoShow) && status === 'confirmed' && !future

  const showOwnerCancel =
    viewType === 'owner' &&
    Boolean(onCancel) &&
    status !== 'cancelled' &&
    status !== 'completed'

  const showOwnerRefund =
    viewType === 'owner' &&
    Boolean(onRefund) &&
    appointment.paymentStatus === 'paid' &&
    status === 'cancelled'

  return (
    <Card className="border-border/70">
      <CardContent className="space-y-3 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {viewType === 'owner' ? (
                <User className="size-4 text-muted-foreground" aria-hidden />
              ) : null}
              <p className="font-heading text-base font-semibold">{title}</p>
              <StatusBadge status={status} />
              <PaymentStatusBadge paymentStatus={appointment.paymentStatus} />
            </div>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium text-foreground">${Number(appointment.service?.price ?? 0).toFixed(2)}</p>
            <p className="text-muted-foreground">{appointment.service?.duration ?? '—'} min</p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
          <p className="font-medium">{appointment.service?.name ?? 'Service'}</p>
          <p className="mt-1 inline-flex items-center gap-2 text-muted-foreground">
            <CalendarClock className="size-4 shrink-0" aria-hidden />
            {formatAppointmentWhen(appointment)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {showClientCancel ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onCancel(appointment)}>
              Cancel
            </Button>
          ) : null}
          {showClientReschedule ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => onReschedule(appointment)}>
              Reschedule
            </Button>
          ) : null}

          {showOwnerConfirm ? (
            <Button type="button" size="sm" onClick={() => onConfirm(appointment)}>
              Confirm
            </Button>
          ) : null}
          {showOwnerComplete ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => onComplete(appointment)}>
              Complete
            </Button>
          ) : null}
          {showOwnerNoShow ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onNoShow(appointment)}>
              No-show
            </Button>
          ) : null}
          {showOwnerCancel ? (
            <Button type="button" variant="destructive" size="sm" onClick={() => onCancel(appointment)}>
              Cancel
            </Button>
          ) : null}
          {showOwnerRefund ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onRefund(appointment)}>
              Refund
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
