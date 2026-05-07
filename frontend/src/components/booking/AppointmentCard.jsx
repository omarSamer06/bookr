import { Link } from 'react-router-dom'
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
    unpaid: 'bg-red-100 text-red-700 border-0',
    paid: 'bg-emerald-100 text-emerald-700 border-0',
    refunded: 'bg-gray-100 text-gray-600 border-0',
    on_arrival: 'bg-blue-100 text-blue-700 border-0',
  }

  const label =
    ps === 'unpaid'
      ? 'Unpaid'
      : ps === 'paid'
        ? 'Paid'
        : ps === 'refunded'
          ? 'Refunded'
          : ps === 'on_arrival'
            ? 'Pay On Arrival'
            : ps

  return (
    <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-semibold capitalize', styles[ps] ?? styles.unpaid)}>
      {label}
    </Badge>
  )
}

/** Centralizes badge chroma so owners + clients read risk consistently */
function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700 border-0',
    confirmed: 'bg-indigo-100 text-indigo-700 border-0',
    completed: 'bg-emerald-100 text-emerald-700 border-0',
    cancelled: 'bg-red-100 text-red-700 border-0',
    'no-show': 'bg-gray-100 text-gray-600 border-0',
  }

  const label = status === 'no-show' ? 'No-show' : status

  return (
    <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-xs font-semibold capitalize', styles[status] ?? '')}>
      {label}
    </Badge>
  )
}

const statusBorder = {
  pending: 'border-l-amber-400',
  confirmed: 'border-l-indigo-500',
  completed: 'border-l-emerald-500',
  cancelled: 'border-l-red-500',
  'no-show': 'border-l-gray-400',
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
  onMarkPaid,
  notificationsHref,
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
        <Mail className="size-3.5 text-bookr-muted" aria-hidden />
        {appointment.client?.email ?? '—'}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1">
        <MapPin className="size-3.5 text-bookr-muted" aria-hidden />
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

  const showOwnerMarkPaid =
    viewType === 'owner' &&
    Boolean(onMarkPaid) &&
    appointment.paymentStatus === 'on_arrival'

  const ownerInitial = (appointment.client?.name?.trim?.()?.[0] ?? appointment.client?.email?.[0] ?? '?').toUpperCase()

  return (
    <Card
      className={cn(
        'overflow-hidden border-gray-100 shadow-sm transition-all duration-200 hover:border-indigo-100 hover:shadow-md',
        'border-l-4',
        statusBorder[status] ?? 'border-l-gray-300'
      )}
    >
      <CardContent className="space-y-4 p-6 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 gap-3">
            {viewType === 'owner' ? (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-100 to-purple-100 text-sm font-bold text-indigo-800">
                {ownerInitial}
              </span>
            ) : null}
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {viewType === 'owner' ? <User className="size-4 text-bookr-muted lg:hidden" aria-hidden /> : null}
                <p className="font-heading text-lg font-bold text-bookr-text">{title}</p>
                <StatusBadge status={status} />
                <PaymentStatusBadge paymentStatus={appointment.paymentStatus} />
              </div>
              <p className="text-sm text-bookr-muted">{subtitle}</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-heading font-bold text-indigo-700 tabular-nums">${Number(appointment.service?.price ?? 0).toFixed(2)}</p>
            <p className="text-bookr-muted">{appointment.service?.duration ?? '—'} min</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm">
          <p className="font-semibold text-bookr-text">{appointment.service?.name ?? 'Service'}</p>
          <p className="mt-2 inline-flex items-center gap-2 text-bookr-muted">
            <CalendarClock className="size-4 shrink-0 text-indigo-400" aria-hidden />
            {formatAppointmentWhen(appointment)}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
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
          {showOwnerMarkPaid ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onMarkPaid(appointment)}>
              Mark as paid
            </Button>
          ) : null}
        </div>

        {viewType === 'client' && notificationsHref ? (
          <p className="text-sm">
            <Link to={notificationsHref} className="font-semibold text-indigo-600 underline-offset-4 hover:underline">
              View notifications
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
