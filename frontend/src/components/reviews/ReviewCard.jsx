import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Building2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import StarRating from '@/components/reviews/StarRating'
import { formatRelativeTime } from '@/lib/formatRelativeTime'
import {
  deleteReview,
  replyToReview,
  reviewQueryKeys,
} from '@/services/review.service.js'

function ClientAvatar({ name, avatar }) {
  const initial = (name?.trim?.()?.[0] ?? '?').toUpperCase()
  if (avatar) {
    return (
      <img src={avatar} alt="" className="size-10 shrink-0 rounded-full object-cover ring-2 ring-white" />
    )
  }
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-100 to-purple-100 text-sm font-bold text-indigo-800 ring-2 ring-white">
      {initial}
    </span>
  )
}

/** Single review row with optional owner reply, delete, and reply actions */
export default function ReviewCard({
  review,
  businessId,
  currentUserId,
  isOwner = false,
  onDeleted,
}) {
  const qc = useQueryClient()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState('')

  const clientId = review.clientId ?? review.client?._id ?? review.client
  const isAuthor =
    Boolean(currentUserId) && clientId && String(clientId) === String(currentUserId)
  const hasOwnerReply = Boolean(review.ownerReply?.comment)
  const canReply = isOwner && !hasOwnerReply

  const deleteMut = useMutation({
    mutationFn: () => deleteReview(review._id),
    onSuccess: async () => {
      toast.success('Review deleted')
      setShowDeleteDialog(false)
      await qc.invalidateQueries({ queryKey: ['reviews', 'business', businessId] })
      await qc.invalidateQueries({ queryKey: reviewQueryKeys.mine })
      await qc.invalidateQueries({ queryKey: ['businesses'] })
      await qc.invalidateQueries({ queryKey: ['appointments', 'mine'] })
      onDeleted?.()
    },
    onError: (err) => toast.error(err.message),
  })

  const replyMut = useMutation({
    mutationFn: () => replyToReview(review._id, replyText.trim()),
    onSuccess: async () => {
      toast.success('Reply posted')
      setShowReplyForm(false)
      setReplyText('')
      await qc.invalidateQueries({ queryKey: ['reviews', 'business', businessId] })
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <article className="relative rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      {isAuthor ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute top-3 right-3 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => setShowDeleteDialog(true)}
        >
          Delete
        </Button>
      ) : null}

      <div className="flex gap-3 pr-16">
        <ClientAvatar name={review.client?.name} avatar={review.client?.avatar} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-bookr-text">{review.client?.name ?? 'Client'}</p>
            <time className="text-xs text-bookr-muted" dateTime={review.createdAt}>
              {formatRelativeTime(review.createdAt)}
            </time>
          </div>
          <StarRating rating={review.rating} size="sm" className="mt-1" />
          <p className="mt-2 text-sm leading-relaxed text-bookr-muted">{review.comment}</p>

          {hasOwnerReply ? (
            <div className="mt-4 ml-0 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 sm:ml-2">
              <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-indigo-800 uppercase">
                <Building2 className="size-3.5" aria-hidden />
                Owner&apos;s Reply
              </p>
              <p className="mt-2 text-sm text-bookr-text">{review.ownerReply.comment}</p>
              {review.ownerReply.repliedAt ? (
                <p className="mt-1 text-xs text-bookr-muted">
                  {formatRelativeTime(review.ownerReply.repliedAt)}
                </p>
              ) : null}
            </div>
          ) : null}

          {canReply && !showReplyForm ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              onClick={() => setShowReplyForm(true)}
            >
              Reply
            </Button>
          ) : null}

          {canReply && showReplyForm ? (
            <div className="mt-4 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your public reply…"
                rows={3}
                maxLength={1000}
                className="resize-none bg-white"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!replyText.trim() || replyMut.isPending}
                  onClick={() => replyMut.mutate()}
                >
                  {replyMut.isPending ? (
                    <>
                      <Loader2 className="mr-1 size-3.5 animate-spin" aria-hidden />
                      Posting…
                    </>
                  ) : (
                    'Submit'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowReplyForm(false)
                    setReplyText('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this review?</DialogTitle>
            <DialogDescription>
              This cannot be undone. The business rating will be recalculated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => deleteMut.mutate()}
            >
              {deleteMut.isPending ? 'Deleting…' : 'Delete review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}
