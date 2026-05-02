import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
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
import { refundPayment } from '@/services/payment.service.js'

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

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <Link
        to="/dashboard/business"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to business dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Appointments</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Filter the live schedule — confirming here matches what clients already see on their end.
          </p>
        </div>
        <Link to="/dashboard" className={cn(buttonVariants({ variant: 'outline' }))}>
          Client home
        </Link>
      </div>

      <div className="grid gap-4 rounded-xl border border-border/70 bg-card/30 p-4 md:grid-cols-3">
        <div className="grid gap-2">
          <Label className="text-muted-foreground">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full min-w-0 justify-between">
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
          <Label htmlFor="oa-date" className="text-muted-foreground">
            Date (YYYY-MM-DD)
          </Label>
          <Input
            id="oa-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="flex items-end justify-between gap-3 md:flex-col md:items-stretch">
          <div className="flex flex-1 items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Upcoming only</p>
              <p className="text-xs text-muted-foreground">Hides anything before today (UTC).</p>
            </div>
            <Switch checked={upcomingOnly} onCheckedChange={setUpcomingOnly} />
          </div>
          <Button type="button" variant="secondary" className="md:w-full" onClick={() => {
            setStatus('all')
            setDate('')
            setUpcomingOnly(false)
          }}>
            Reset filters
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading appointments…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{error?.message}</p>
      ) : !appointments.length ? (
        <p className="text-sm text-muted-foreground">No appointments match these filters.</p>
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
              {refundMut.isPending ? 'Refunding…' : 'Confirm refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
