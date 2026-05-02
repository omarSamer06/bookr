import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

/** Mirrors checkout receipts so clients sanity-check totals before Stripe mounts */
export default function BookingSummary({
  businessName,
  serviceName,
  durationMinutes,
  dateStr,
  timeStr,
  priceAmount,
  notes,
}) {
  const priceLabel =
    Number(priceAmount) === 0 ? 'Free' : `$${Number(priceAmount ?? 0).toFixed(2)}`

  return (
    <Card className="border-border/70 bg-muted/15">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Booking summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <p className="text-muted-foreground">Business</p>
            <p className="font-medium">{businessName}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Price</p>
            <p className="font-semibold text-foreground">{priceLabel}</p>
          </div>
        </div>
        <Separator />
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Service</p>
            <p className="font-medium">{serviceName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Duration</p>
            <p className="font-medium">{durationMinutes ?? '—'} min</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">When</p>
            <p className="font-medium">
              {dateStr} · {timeStr}
            </p>
          </div>
        </div>
        {notes?.trim() ? (
          <>
            <Separator />
            <div>
              <p className="text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{notes.trim()}</p>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
