import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import AppointmentCard from '@/components/booking/AppointmentCard'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  appointmentQueryKeys,
  cancelAppointment,
  getBusinessAppointments,
  updateAppointmentStatus,
} from '@/services/appointment.service.js'
import { markAsPaid, refundPayment } from '@/services/payment.service.js'

function OwnerAppointmentsSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
      ))}
    </div>
  )
}

/** Owner filters mirror backend query params so cache keys stay predictable */
export default function OwnerAppointmentsPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('all')
  const [date, setDate] = useState('')
  const [upcomingOnly, setUpcomingOnly] = useState(false)
  const [refundTarget, setRefundTarget] = useState(null)

  const filters = useMemo(() => {
    const f = {}
    if (status !== 'all') f.status = status
    if (date.trim()) f.date = date.trim()
    if (upcomingOnly) f.upcoming = true
    return f
  }, [status, date, upcomingOnly])

  const { data: appointments = [], isLoading, isError, error } = useQuery({
    queryKey: appointmentQueryKeys.business(filters),
    queryFn: () => getBusinessAppointments(filters),
    staleTime: 20 * 1000,
  })

  const patchStatus = useMutation({
    mutationFn: ({ id, next }) => updateAppointmentStatus(id, next),
    onSuccess: async () => {
      toast.success('Appointment updated')
      await qc.invalidateQueries({ queryKey: ['appointments', 'business'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const cancelMut = useMutation({
    mutationFn: (id) => cancelAppointment(id),
    onSuccess: async () => {
      toast.success('Appointment cancelled')
      await qc.invalidateQueries({ queryKey: ['appointments', 'business'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const refundMut = useMutation({
    mutationFn: (id) => refundPayment(id),
    onSuccess: async () => {
      toast.success('Refund issued')
      await qc.invalidateQueries({ queryKey: ['appointments', 'business'] })
      setRefundTarget(null)
    },
    onError: (err) => toast.error(err.message),
  })

  const markPaidMut = useMutation({
    mutationFn: (id) => markAsPaid(id),
    onSuccess: async () => {
      toast.success('Marked as paid')
      await qc.invalidateQueries({ queryKey: ['appointments', 'business'] })
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-bookr-text sm:text-4xl">Appointments</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-bookr-muted sm:text-base">
            Filter the live schedule — confirming here matches what clients already see on their end.
          </p>
        </div>
        <Link to="/dashboard" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-gray-200')}>
          Client home
        </Link>
      </div>

      <div className="grid gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:grid-cols-3">
        <div className="grid gap-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-11 w-full min-w-0 justify-between rounded-xl border-gray-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no-show">No-show</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="oa-date">Date (YYYY-MM-DD)</Label>
          <Input id="oa-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="flex flex-col gap-3 md:justify-end">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-bookr-text">Upcoming only</p>
              <p className="text-xs text-bookr-muted">Hides anything before today (UTC).</p>
            </div>
            <Switch checked={upcomingOnly} onCheckedChange={setUpcomingOnly} />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full md:w-auto"
            onClick={() => {
              setStatus('all')
              setDate('')
              setUpcomingOnly(false)
            }}
          >
            Reset filters
          </Button>
        </div>
      </div>

      {isLoading ? (
        <OwnerAppointmentsSkeleton />
      ) : isError ? (
        <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/50 px-6 py-12 text-center text-sm font-medium text-red-700">
          {error?.message}
        </div>
      ) : !appointments.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="font-heading text-lg font-bold text-bookr-text">No appointments match</p>
          <p className="mt-2 max-w-md text-sm text-bookr-muted">Adjust filters or check back after new bookings roll in.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {appointments.map((appt) => (
            <AppointmentCard
              key={appt._id}
              appointment={appt}
              viewType="owner"
              onConfirm={() => patchStatus.mutate({ id: appt._id, next: 'confirmed' })}
              onComplete={() => patchStatus.mutate({ id: appt._id, next: 'completed' })}
              onNoShow={() => patchStatus.mutate({ id: appt._id, next: 'no-show' })}
              onCancel={() => cancelMut.mutate(appt._id)}
              onRefund={(row) => setRefundTarget(row)}
              onMarkPaid={
                appt.paymentStatus === 'on_arrival'
                  ? () => markPaidMut.mutate(appt._id)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <Dialog open={Boolean(refundTarget)} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Issue Stripe refund?</DialogTitle>
            <DialogDescription>
              This pushes money back through Stripe immediately — Bookr cannot undo it here afterward.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setRefundTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={refundMut.isPending}
              onClick={() => refundTarget && refundMut.mutate(refundTarget._id)}
            >
              {refundMut.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Refunding…
                </>
              ) : (
                'Confirm refund'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
