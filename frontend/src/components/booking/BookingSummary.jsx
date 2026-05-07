import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

/** Mirrors checkout receipts so clients sanity-check totals before Stripe mounts */
export default function BookingSummary({
  businessName,
  serviceName,
  durationMinutes,
  dateStr,
  timeStr,
  priceAmount,
  paymentMethod,
  notes,
}) {
  const priceLabel =
    Number(priceAmount) === 0 ? 'Free' : `$${Number(priceAmount ?? 0).toFixed(2)}`

  return (
    <Card className="border-gray-100 bg-linear-to-br from-white to-indigo-50/50 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle>Booking summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-bookr-muted">Business</p>
            <p className="mt-1 font-semibold text-bookr-text">{businessName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-bookr-muted">Price</p>
            <div className="mt-1 flex items-center justify-end gap-2">
              <p className="font-heading text-lg font-bold text-indigo-700 tabular-nums">{priceLabel}</p>
              {paymentMethod === 'on_arrival' ? (
                <Badge className="rounded-full bg-blue-100 text-blue-700 border-0">Pay On Arrival</Badge>
              ) : paymentMethod === 'online' ? (
                <Badge className="rounded-full bg-emerald-100 text-emerald-700 border-0">Online</Badge>
              ) : null}
            </div>
          </div>
        </div>
        <Separator className="bg-gray-100" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-bookr-muted">Service</p>
            <p className="mt-1 font-medium text-bookr-text">{serviceName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-bookr-muted">Duration</p>
            <p className="mt-1 font-medium text-bookr-text">{durationMinutes ?? '—'} min</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-bookr-muted">When</p>
            <p className="mt-1 font-medium text-bookr-text">
              {dateStr} · {timeStr}
            </p>
          </div>
        </div>
        {notes?.trim() ? (
          <>
            <Separator className="bg-gray-100" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-bookr-muted">Notes</p>
              <p className="mt-2 whitespace-pre-wrap text-bookr-muted">{notes.trim()}</p>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
