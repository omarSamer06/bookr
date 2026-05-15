import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const SIZE_MAP = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
}

/** Interactive or read-only star row; whole stars only */
export default function StarRating({
  rating = 0,
  maxStars = 5,
  interactive = false,
  onRate,
  size = 'md',
  className,
}) {
  const [hover, setHover] = useState(null)
  const iconClass = SIZE_MAP[size] ?? SIZE_MAP.md
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1)
  const displayValue = interactive ? (hover ?? rating) : rating

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={interactive ? 'Select rating' : `Rating: ${rating} out of ${maxStars}`}
      onMouseLeave={interactive ? () => setHover(null) : undefined}
    >
      {stars.map((star) => {
        const filled = star <= displayValue
        const starIcon = (
          <Star
            className={cn(
              iconClass,
              filled ? 'fill-amber-400 text-amber-400' : 'text-gray-300',
              interactive && 'transition-colors'
            )}
            aria-hidden
          />
        )

        if (!interactive) {
          return (
            <span key={star} className="inline-flex">
              {starIcon}
            </span>
          )
        }

        return (
          <button
            key={star}
            type="button"
            className="inline-flex rounded p-0.5 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            onMouseEnter={() => setHover(star)}
            onClick={() => onRate?.(star)}
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
          >
            {starIcon}
          </button>
        )
      })}
    </div>
  )
}
