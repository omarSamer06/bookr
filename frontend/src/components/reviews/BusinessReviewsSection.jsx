import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StarRating from '@/components/reviews/StarRating'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { getBusinessReviews, reviewQueryKeys } from '@/services/review.service.js'

function ReviewAvatar({ name, avatar }) {
  const initial = (name?.trim?.()?.[0] ?? '?').toUpperCase()
  if (avatar) {
    return <img src={avatar} alt="" className="size-10 rounded-full object-cover ring-2 ring-white" />
  }
  return (
    <span className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-indigo-100 to-purple-100 text-sm font-bold text-indigo-800 ring-2 ring-white">
      {initial}
    </span>
  )
}

/** Paginated public reviews list for a business profile */
export default function BusinessReviewsSection({ businessId, averageRating = 0, totalReviews = 0 }) {
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: reviewQueryKeys.business(businessId, page),
    queryFn: () => getBusinessReviews(businessId, { page, limit: 5 }),
    enabled: Boolean(businessId),
    staleTime: 60 * 1000,
  })

  const reviews = data?.reviews ?? []
  const avg = data?.averageRating ?? averageRating
  const total = data?.totalReviews ?? totalReviews
  const totalPages = data?.totalPages ?? 1

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="size-5 text-indigo-500" aria-hidden />
            Reviews
          </CardTitle>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StarRating value={avg} size="sm" />
            <span className="text-sm font-semibold text-bookr-text">
              {Number(avg).toFixed(1)} · {total} review{total === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-4" aria-hidden>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-50" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <p className="text-sm text-red-600">{error?.message ?? 'Could not load reviews.'}</p>
        ) : null}

        {!isLoading && !isError && !reviews.length ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center text-sm text-bookr-muted">
            No reviews yet. Be the first after your visit!
          </p>
        ) : null}

        {!isLoading && !isError
          ? reviews.map((review) => (
              <article
                key={review._id}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex gap-3">
                  <ReviewAvatar name={review.client?.name} avatar={review.client?.avatar} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-bookr-text">{review.client?.name ?? 'Client'}</p>
                      <time className="text-xs text-bookr-muted" dateTime={review.createdAt}>
                        {formatRelativeTime(review.createdAt)}
                      </time>
                    </div>
                    <StarRating value={review.rating} size="sm" className="mt-1" />
                    <p className="mt-2 text-sm leading-relaxed text-bookr-muted">{review.comment}</p>

                    {review.ownerReply?.comment ? (
                      <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
                        <p className="text-xs font-bold tracking-wide text-indigo-700 uppercase">
                          Owner response
                        </p>
                        <p className="mt-1 text-sm text-bookr-text">{review.ownerReply.comment}</p>
                        {review.ownerReply.repliedAt ? (
                          <p className="mt-1 text-xs text-bookr-muted">
                            {formatRelativeTime(review.ownerReply.repliedAt)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          : null}

        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-bookr-muted">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

