import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clock, Globe, MapPin, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { WEEKDAYS, categoryLabel } from '@/lib/businessConstants'
import { cn } from '@/lib/utils'
import { businessQueryKeys, getBusinessById } from '@/services/business.service.js'

function formatHours(day) {
  if (!day) return '—'
  if (day.isOff) return 'Closed'
  return `${day.open} – ${day.close}`
}

/** Read-only summary mirrors booking funnel expectations without leaking owner credentials */
export default function BusinessDetailPage() {
  const { id } = useParams()

  const {
    data: business,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: businessQueryKeys.detail(id),
    queryFn: () => getBusinessById(id),
    enabled: Boolean(id),
    retry: false,
  })

  if (!id) {
    return (
      <div className="px-4 py-12 text-center text-sm text-muted-foreground">
        Missing business id.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="px-4 py-12 text-center text-sm text-muted-foreground">
        Loading profile…
      </div>
    )
  }

  if (isError || !business) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-destructive">{error?.message ?? 'Business not found.'}</p>
        <Link to="/businesses" className={cn(buttonVariants(), 'mt-4 inline-flex')}>
          Back to directory
        </Link>
      </div>
    )
  }

  const activeServices = (business.services ?? []).filter((s) => s.isActive !== false)

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <Link
        to="/businesses"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        All businesses
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl ring-1 ring-border">
            {business.images?.[0] ? (
              <img src={business.images[0]} alt="" className="aspect-video w-full object-cover" />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-muted text-muted-foreground">
                No hero image yet
              </div>
            )}
          </div>
          {business.images?.length > 1 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {business.images.slice(1).map((url) => (
                <img key={url} src={url} alt="" className="aspect-video rounded-lg object-cover ring-1 ring-border" />
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div>
            <Badge variant="secondary">{categoryLabel(business.category)}</Badge>
            <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">{business.name}</h1>
            {business.owner?.name ? (
              <p className="mt-1 text-sm text-muted-foreground">Hosted by {business.owner.name}</p>
            ) : null}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{business.description || 'No description yet.'}</p>
          <Separator />
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                {[business.location?.address, business.location?.city, business.location?.country]
                  .filter(Boolean)
                  .join(', ') || 'Location coming soon'}
              </span>
            </li>
            {business.phone ? (
              <li className="flex gap-2">
                <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <a href={`tel:${business.phone}`} className="text-primary underline-offset-4 hover:underline">
                  {business.phone}
                </a>
              </li>
            ) : null}
            {business.website ? (
              <li className="flex gap-2">
                <Globe className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <a
                  href={business.website}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-primary underline-offset-4 hover:underline"
                >
                  {business.website}
                </a>
              </li>
            ) : null}
          </ul>
          <Link
            to={`/book/${business._id}`}
            className={cn(buttonVariants(), 'inline-flex w-full justify-center')}
          >
            Book now
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!activeServices.length ? (
            <p className="text-sm text-muted-foreground">Services haven’t been published yet.</p>
          ) : (
            activeServices.map((s) => (
              <div
                key={s._id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/70 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{s.name}</p>
                  {s.description ? (
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" aria-hidden />
                    {s.duration} min
                  </span>
                  <span className="font-medium text-foreground">${Number(s.price).toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hours</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {WEEKDAYS.map(({ key, label }) => (
            <div key={key} className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span>{formatHours(business.workingHours?.[key])}</span>
            </div>
          ))}
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            Slots are offered in {business.slotDuration ?? 30}-minute increments when booking opens.
          </p>
        </CardContent>
      </Card>

      {(business.breaks ?? []).length ? (
        <Card>
          <CardHeader>
            <CardTitle>Breaks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {business.breaks.map((br, i) => (
              <p key={`${br.name}-${i}`}>
                <span className="font-medium">{br.name}</span>
                <span className="text-muted-foreground"> · {br.start}–{br.end}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
