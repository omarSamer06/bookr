import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Building2, Loader2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import StarRating from '@/components/reviews/StarRating'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import { categoryLabel } from '@/lib/businessConstants'
import { deleteReview, getMyReviews, reviewQueryKeys } from '@/services/review.service.js'
import { useState } from 'react'

function MyReviewsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-2xl bg-gray-100" />
      ))}
    </div>
  )
}

/** Client history of reviews they have submitted */
export default function MyReviewsPage() {
  const qc = useQueryClient()
  const [deleteId, setDeleteId] = useState(null)

  const { data: reviews = [], isLoading, isError, error } = useQuery({
    queryKey: reviewQueryKeys.mine,
    queryFn: getMyReviews,
    staleTime: 30 * 1000,
  })

  const deleteMut = useMutation({
    mutationFn: (id) => deleteReview(id),
    onSuccess: async () => {
      toast.success('Review deleted')
      setDeleteId(null)
      await qc.invalidateQueries({ queryKey: reviewQueryKeys.mine })
      await qc.invalidateQueries({ queryKey: ['reviews'] })
      await qc.invalidateQueries({ queryKey: ['businesses'] })
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-bookr-text sm:text-4xl">
          My Reviews
        </h1>
        <p className="mt-2 text-sm text-bookr-muted">Reviews you have left after completed visits.</p>
      </div>

      {isLoading ? <MyReviewsSkeleton /> : null}

      {isError ? (
        <p className="text-sm text-red-600">{error?.message}</p>
      ) : null}

      {!isLoading && !isError && !reviews.length ? (
        <Card className="border-dashed border-gray-200 shadow-sm">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Star className="mb-4 size-12 text-indigo-200" aria-hidden />
            <p className="font-heading text-lg font-bold text-bookr-text">
              You haven&apos;t written any reviews yet.
            </p>
            <Button asChild className="mt-6" variant="outline">
              <Link to="/dashboard/appointments">View appointments</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !isError && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review._id} className="border-gray-100 shadow-sm">
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      to={
                        review.business?._id
                          ? `/businesses/${review.business._id}`
                          : '/businesses'
                      }
                      className="font-heading font-bold text-indigo-700 hover:underline"
                    >
                      {review.business?.name ?? 'Business'}
                    </Link>
                    {review.business?.category ? (
                      <p className="mt-0.5 text-xs text-bookr-muted">
                        {categoryLabel(review.business.category)}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-bookr-muted">
                      {formatRelativeTime(review.createdAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setDeleteId(review._id)}
                  >
                    Delete
                  </Button>
                </div>
                <StarRating rating={review.rating} size="sm" />
                <p className="text-sm leading-relaxed text-bookr-muted">{review.comment}</p>
                {review.ownerReply?.comment ? (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 uppercase">
                      <Building2 className="size-3.5" aria-hidden />
                      Owner&apos;s reply
                    </p>
                    <p className="mt-2 text-sm text-bookr-text">{review.ownerReply.comment}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this review?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
            >
              {deleteMut.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
