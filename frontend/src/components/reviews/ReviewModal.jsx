import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import StarRating from '@/components/reviews/StarRating'
import { createReview, reviewQueryKeys } from '@/services/review.service.js'

/** Modal for clients to submit a review after a completed visit */
export default function ReviewModal({ open, onOpenChange, appointment }) {
  const qc = useQueryClient()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      createReview({
        appointmentId: appointment._id,
        rating,
        comment: comment.trim(),
      }),
    onSuccess: async () => {
      toast.success('Thanks for your review!')
      setComment('')
      setRating(5)
      onOpenChange(false)
      await qc.invalidateQueries({ queryKey: ['appointments', 'mine'] })
      await qc.invalidateQueries({ queryKey: reviewQueryKeys.mine })
      if (appointment.business?._id) {
        await qc.invalidateQueries({
          queryKey: ['reviews', 'business', appointment.business._id],
        })
        await qc.invalidateQueries({
          queryKey: ['businesses', 'detail', appointment.business._id],
        })
      }
    },
    onError: (err) => toast.error(err.message),
  })

  const trimmedLen = comment.trim().length
  const canSubmit = rating >= 1 && trimmedLen >= 10 && trimmedLen <= 500

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Leave a review</DialogTitle>
          <DialogDescription>
            Share your experience at {appointment?.business?.name ?? 'this business'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-bookr-text">Your rating</p>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          <div className="space-y-2">
            <label htmlFor="review-comment" className="text-sm font-medium text-bookr-text">
              Comment
            </label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What went well? What could be improved?"
              rows={4}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-bookr-muted">
              {trimmedLen}/500 · minimum 10 characters
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Submitting…' : 'Submit review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
