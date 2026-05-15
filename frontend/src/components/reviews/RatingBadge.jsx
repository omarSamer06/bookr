import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Compact average rating chip for cards and headers */
export default function RatingBadge({ rating = 0, totalReviews = 0, size = 'md', className }) {
  const count = Number(totalReviews) || 0
  const avg = Number(rating) || 0
  const sm = size === 'sm'

  if (count === 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-bookr-muted',
          sm ? 'text-xs' : 'text-sm',
          className
        )}
      >
        <Star className={cn(sm ? 'size-3.5' : 'size-4', 'text-gray-300')} aria-hidden />
        No reviews yet
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex flex-wrap items-center gap-1 font-medium text-amber-700',
        sm ? 'text-xs' : 'text-sm',
        className
      )}
    >
      <Star className={cn(sm ? 'size-3.5' : 'size-4', 'fill-amber-400 text-amber-400')} aria-hidden />
      <span className="tabular-nums">{avg.toFixed(1)}</span>
      <span className="text-bookr-muted font-normal">
        ({count} review{count === 1 ? '' : 's'})
      </span>
    </span>
  )
}
