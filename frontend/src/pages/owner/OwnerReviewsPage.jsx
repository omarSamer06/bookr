import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import StarRating from '@/components/reviews/StarRating'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import {
  getOwnerBusinessReviews,
  replyToReview,
  reviewQueryKeys,
} from '@/services/review.service.js'

function ReviewAvatar({ name, avatar }) {
  const initial = (name?.trim?.()?.[0] ?? '?').toUpperCase()
  if (avatar) {
    return <img src={avatar} alt="" className="size-10 rounded-full object-cover" />
  }
  return (
    <span className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-indigo-100 to-purple-100 text-sm font-bold text-indigo-800">
      {initial}
    </span>
  )
}

/** Owner dashboard for reading and replying to customer reviews */
export default function OwnerReviewsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [replyDrafts, setReplyDrafts] = useState({})

  const { data, isLoading, isError, error } = useQuery({
    queryKey: reviewQueryKeys.owner(page),
    queryFn: () => getOwnerBusinessReviews({ page, limit: 10 }),
    staleTime: 30 * 1000,
  })

  const replyMutation = useMutation({
    mutationFn: ({ reviewId, comment }) => replyToReview(reviewId, comment),
    onSuccess: async () => {
      toast.success('Reply posted')
      await qc.invalidateQueries({ queryKey: ['reviews', 'owner'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const reviews = data?.reviews ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-bookr-text">Reviews</h1>
        <p className="mt-2 text-sm text-bookr-muted">
          Respond to feedback from clients who completed appointments.
        </p>
        {data ? (
          <div className="mt-4 flex items-center gap-3">
            <StarRating value={data.averageRating ?? 0} size="sm" />
            <span className="text-sm font-semibold text-bookr-text">
              {Number(data.averageRating ?? 0).toFixed(1)} average · {data.totalReviews ?? 0} total
            </span>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-4" aria-hidden>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : null}

      {isError ? <p className="text-sm text-red-600">{error?.message}</p> : null}

      {!isLoading && !isError && !reviews.length ? (
        <Card className="border-dashed border-gray-200 shadow-sm">
          <CardContent className="py-12 text-center text-sm text-bookr-muted">
            No reviews yet. They will appear here after clients rate completed visits.
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !isError
        ? reviews.map((review) => {
            const hasReply = Boolean(review.ownerReply?.comment)
            const draft = replyDrafts[review._id] ?? ''

            return (
              <Card key={review._id} className="border-gray-100 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex gap-3">
                    <ReviewAvatar name={review.client?.name} avatar={review.client?.avatar} />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">{review.client?.name ?? 'Client'}</CardTitle>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StarRating value={review.rating} size="sm" />
                        <span className="text-xs text-bookr-muted">
                          {formatRelativeTime(review.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-relaxed text-bookr-muted">{review.comment}</p>

                  {hasReply ? (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
                      <p className="text-xs font-bold text-indigo-700 uppercase">Your reply</p>
                      <p className="mt-1 text-sm text-bookr-text">{review.ownerReply.comment}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        value={draft}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [review._id]: e.target.value }))
                        }
                        placeholder="Write a public reply…"
                        rows={3}
                        maxLength={1000}
                        className="resize-none"
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={!draft.trim() || replyMutation.isPending}
                        onClick={() =>
                          replyMutation.mutate(
                            { reviewId: review._id, comment: draft.trim() },
                            {
                              onSuccess: () =>
                                setReplyDrafts((prev) => {
                                  const next = { ...prev }
                                  delete next[review._id]
                                  return next
                                }),
                            }
                          )
                        }
                      >
                        Post reply
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        : null}

      {totalPages > 1 ? (
        <div className="flex justify-center gap-3">
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
    </div>
  )
}
