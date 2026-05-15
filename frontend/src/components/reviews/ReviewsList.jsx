import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ReviewCard from '@/components/reviews/ReviewCard'
import StarRating from '@/components/reviews/StarRating'
import useAuth from '@/hooks/useAuth'
import { getBusinessReviews } from '@/services/review.service.js'

const PAGE_SIZE = 5

function computeBreakdown(reviews) {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const r of reviews) {
    const n = Math.round(Number(r.rating))
    if (n >= 1 && n <= 5) counts[n] += 1
  }
  const total = reviews.length || 1
  return [5, 4, 3, 2, 1].map((star) => ({
    star,
    percent: Math.round((counts[star] / total) * 100),
  }))
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-28 animate-pulse rounded-2xl bg-gray-100" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-50" />
      ))}
    </div>
  )
}

/** Paginated business reviews with summary and load-more */
export default function ReviewsList({ businessId, isOwner = false }) {
  const { user } = useAuth()

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['reviews', 'business', businessId, 'list'],
    queryFn: ({ pageParam }) => getBusinessReviews(businessId, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.currentPage < last.totalPages ? last.currentPage + 1 : undefined,
    enabled: Boolean(businessId),
    staleTime: 30 * 1000,
  })

  const pages = useMemo(() => data?.pages ?? [], [data?.pages])
  const firstPage = pages[0]
  const allReviews = useMemo(() => pages.flatMap((p) => p.reviews ?? []), [pages])
  const averageRating = firstPage?.averageRating ?? 0
  const totalReviews = firstPage?.totalReviews ?? 0
  const breakdown = useMemo(() => computeBreakdown(allReviews), [allReviews])

  if (isLoading) {
    return (
      <Card className="border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewsSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card className="border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error?.message ?? 'Could not load reviews.'}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader>
        <CardTitle>
          Reviews
          {totalReviews > 0 ? (
            <span className="ml-2 text-base font-normal text-bookr-muted">({totalReviews})</span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {totalReviews > 0 ? (
          <div className="flex flex-col gap-6 rounded-2xl border border-gray-100 bg-gray-50/60 p-5 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2 sm:min-w-[120px]">
              <span className="font-heading text-4xl font-bold text-bookr-text tabular-nums">
                {Number(averageRating).toFixed(1)}
              </span>
              <StarRating rating={averageRating} size="lg" />
              <span className="text-sm text-bookr-muted">
                {totalReviews} review{totalReviews === 1 ? '' : 's'}
              </span>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {breakdown.map(({ star, percent }) => (
                <div key={star} className="flex items-center gap-3 text-sm">
                  <span className="w-12 shrink-0 font-medium text-bookr-muted">{star} stars</span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs text-bookr-muted tabular-nums">
                    {percent}%
                  </span>
                </div>
              ))}
              {allReviews.length < totalReviews ? (
                <p className="pt-1 text-xs text-bookr-muted">
                  Breakdown based on {allReviews.length} loaded review
                  {allReviews.length === 1 ? '' : 's'}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {!allReviews.length ? (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-bookr-muted">
            No reviews yet. Be the first to leave a review!
          </p>
        ) : (
          <div className="space-y-4">
            {allReviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                businessId={businessId}
                currentUserId={user?._id}
                isOwner={isOwner}
              />
            ))}
          </div>
        )}

        {hasNextPage ? (
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Loading…
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
