import { Link, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clock, MapPin, MessageCircle, Phone } from 'lucide-react'
import RatingBadge from '@/components/reviews/RatingBadge'
import ReviewsList from '@/components/reviews/ReviewsList'
import useAuth from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getEffectiveCancellationPolicy } from '@/lib/bookingUtils'
import { WEEKDAYS, categoryLabel } from '@/lib/businessConstants'
import { cn } from '@/lib/utils'
import { businessQueryKeys, getBusinessById } from '@/services/business.service.js'
import { useChatbotStore } from '@/store/chatbotStore'

function formatHours(day) {
  if (!day) return '—'
  if (day.isOff) return 'Closed'
  return `${day.open} – ${day.close}`
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-8 px-4 py-10 sm:px-6 lg:px-8" aria-hidden>
      <div className="h-5 w-32 rounded bg-gray-200" />
      <div className="h-64 w-full rounded-2xl bg-gray-100" />
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="h-8 w-64 max-w-full rounded bg-gray-100" />
          <div className="h-24 rounded-xl bg-gray-50" />
        </div>
        <div className="h-48 rounded-2xl bg-gray-50" />
      </div>
    </div>
  )
}

/** Read-only summary mirrors booking funnel expectations without leaking owner credentials */
export default function BusinessDetailPage() {
  const { id } = useParams()
  const openChat = useChatbotStore((s) => s.openChat)
  const { user, isAuthenticated } = useAuth()

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

  // Keep hook order stable; only fire the side effect when data is ready.
  useEffect(() => {
    if (!business?._id) return
    openChat(business._id, { openWindow: false, businessName: business.name })
  }, [business?._id, business?.name, openChat])

  if (!id) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-sm text-bookr-muted">Missing business id.</p>
      </div>
    )
  }

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (isError || !business) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center sm:px-6">
        <p className="text-sm font-medium text-red-600">{error?.message ?? 'Business not found.'}</p>
        <Link to="/businesses" className={cn(buttonVariants(), 'mt-6')}>
          Back to directory
        </Link>
      </div>
    )
  }

  const activeServices = (business.services ?? []).filter((s) => s.isActive !== false)
  const ownerId = business.owner?._id ?? business.owner
  const isOwner =
    isAuthenticated &&
    user?.role === 'owner' &&
    ownerId &&
    String(ownerId) === String(user._id)

  const cancellationPolicy = getEffectiveCancellationPolicy(business)

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <Link
        to="/businesses"
        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All businesses
      </Link>

      <section className="relative overflow-hidden rounded-3xl ring-1 ring-gray-100">
        <div className="relative aspect-21/9 min-h-[220px] w-full bg-gray-100 sm:min-h-[280px]">
          {business.images?.[0] ? (
            <>
              <img src={business.images[0]} alt="" className="size-full object-cover" />
              <div className="absolute inset-0 bg-linear-to-r from-indigo-950/85 via-violet-900/55 to-purple-800/35" />
            </>
          ) : (
            <div className="flex size-full items-center justify-center bg-linear-to-br from-indigo-100 to-purple-100 text-bookr-muted">
              No hero image yet
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
            <Badge className="rounded-full border-0 bg-white/95 px-3 py-1 text-xs font-semibold text-indigo-800 shadow-sm">
              {categoryLabel(business.category)}
            </Badge>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {business.name}
              </h1>
              <RatingBadge
                rating={business.averageRating}
                totalReviews={business.totalReviews}
                size="sm"
                className="rounded-full bg-white/95 px-3 py-1 shadow-sm [&_span]:text-amber-900"
              />
            </div>
            {business.owner?.name ? <p className="mt-2 text-sm text-indigo-100">Hosted by {business.owner.name}</p> : null}
          </div>
        </div>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-bookr-muted">
              <p>{business.description || 'No description yet.'}</p>
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle>Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!activeServices.length ? (
                <p className="text-sm text-bookr-muted">Services haven’t been published yet.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeServices.map((s) => (
                    <div
                      key={s._id}
                      className="rounded-2xl border border-gray-100 bg-linear-to-br from-white to-indigo-50/40 p-4 shadow-sm transition-all duration-200 hover:border-indigo-100 hover:shadow-md"
                    >
                      <p className="font-heading font-bold text-bookr-text">{s.name}</p>
                      {s.description ? <p className="mt-2 text-sm text-bookr-muted">{s.description}</p> : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-semibold text-indigo-700">
                          <Clock className="size-3.5" aria-hidden />
                          {s.duration} min
                        </span>
                        <span className="inline-flex rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                          ${Number(s.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle>Working hours</CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <tbody>
                  {WEEKDAYS.map(({ key, label }) => (
                    <tr key={key} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-bookr-muted">{label}</td>
                      <td className="px-4 py-3 text-right font-semibold text-bookr-text">{formatHours(business.workingHours?.[key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-gray-100 bg-gray-50/80 px-4 py-3 text-xs text-bookr-muted">
                Slots are offered in {business.slotDuration ?? 30}-minute increments when booking opens.
              </p>
            </CardContent>
          </Card>

          {(business.breaks ?? []).length ? (
            <Card className="border-gray-100 shadow-sm">
              <CardHeader>
                <CardTitle>Breaks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {business.breaks.map((br, i) => (
                  <p key={`${br.name}-${i}`}>
                    <span className="font-semibold text-bookr-text">{br.name}</span>
                    <span className="text-bookr-muted"> · {br.start}–{br.end}</span>
                  </p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {business.images?.length > 1 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {business.images.slice(1).map((url) => (
                <img key={url} src={url} alt="" className="aspect-video rounded-2xl object-cover ring-1 ring-gray-100" />
              ))}
            </div>
          ) : null}

          <ReviewsList businessId={business._id} isOwner={isOwner} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <Card className="border-gray-100 shadow-md">
            <CardHeader>
              <CardTitle className="text-base">Visit & contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-indigo-500" aria-hidden />
                <span className="text-bookr-muted">
                  {[business.location?.address, business.location?.city, business.location?.country]
                    .filter(Boolean)
                    .join(', ') || 'Location coming soon'}
                </span>
              </div>
              {business.phone ? (
                <div className="flex gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-indigo-500" aria-hidden />
                  <a href={`tel:${business.phone}`} className="font-medium text-indigo-600 underline-offset-4 hover:underline">
                    {business.phone}
                  </a>
                </div>
              ) : null}
              <Separator />
              <div className="space-y-2">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-bookr-muted">
                  <Clock className="size-3.5 text-indigo-500" aria-hidden />
                  Cancellation policy
                </p>
                {cancellationPolicy.allowed ? (
                  <>
                    <Badge className="rounded-full border-0 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                      Free Cancellation
                    </Badge>
                    <p className="text-sm leading-relaxed text-bookr-muted">{cancellationPolicy.description}</p>
                  </>
                ) : (
                  <>
                    <Badge className="rounded-full border-0 bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
                      No Online Cancellations
                    </Badge>
                    <p className="text-sm leading-relaxed text-bookr-muted">
                      Please contact the business directly to cancel
                    </p>
                  </>
                )}
              </div>
              <Separator />
              <Link
                to={`/book/${business._id}`}
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'w-full justify-center bg-linear-to-r from-indigo-500 to-purple-600 text-white shadow-sm hover:scale-[1.02] hover:from-indigo-600 hover:to-purple-700'
                )}
              >
                Book now
              </Link>
              <button
                type="button"
                onClick={() => openChat(business._id, { openWindow: true, businessName: business.name })}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'w-full justify-center border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                )}
              >
                <MessageCircle className="mr-2 size-4" aria-hidden />
                Chat with us
              </button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
