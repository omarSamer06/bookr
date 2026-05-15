import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import StarRating from '@/components/reviews/StarRating'
import { createReview } from '@/services/review.service.js'

/** Client review submission form for a completed appointment */
export default function ReviewForm({ appointmentId, businessName, onSuccess }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      createReview({
        appointmentId,
        rating,
        comment: comment.trim(),
      }),
    onSuccess: (review) => {
      toast.success('Review submitted!')
      setRating(0)
      setComment('')
      onSuccess?.(review)
    },
    onError: (err) => toast.error(err.message),
  })

  const trimmedLen = comment.trim().length
  const canSubmit = rating >= 1 && trimmedLen >= 10 && trimmedLen <= 500

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit && !mutation.isPending) mutation.mutate()
      }}
    >
      <h3 className="font-heading text-lg font-bold text-bookr-text">
        How was your experience at {businessName}?
      </h3>

      <div className="space-y-2">
        <p className="text-sm font-medium text-bookr-text">
          Your rating <span className="text-red-500">*</span>
        </p>
        <StarRating rating={rating} interactive onRate={setRating} size="lg" />
      </div>

      <div className="space-y-2">
        <label htmlFor="review-comment" className="text-sm font-medium text-bookr-text">
          Your review <span className="text-red-500">*</span>
        </label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share what went well or what could improve…"
          rows={4}
          maxLength={500}
          className="resize-none"
        />
        <p className="text-xs text-bookr-muted">
          {trimmedLen}/500 characters · minimum 10
        </p>
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={!canSubmit || mutation.isPending}>
        {mutation.isPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            Submitting…
          </>
        ) : (
          'Submit Review'
        )}
      </Button>
    </form>
  )
}
