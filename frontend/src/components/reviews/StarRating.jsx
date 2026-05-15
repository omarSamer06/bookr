import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Read-only or interactive star row for ratings */
export default function StarRating({ value = 0, onChange, size = 'md', className }) {
  const sizes = {
    sm: 'size-3.5',
    md: 'size-5',
    lg: 'size-6',
  }
  const iconClass = sizes[size] ?? sizes.md
  const interactive = typeof onChange === 'function'
  const rounded = Math.round(Number(value) * 2) / 2

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : undefined}
      aria-label={interactive ? 'Rating' : `Rating: ${rounded} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.floor(rounded)
        const half = !filled && star - 0.5 <= rounded

        const Icon = (
          <Star
            className={cn(
              iconClass,
              filled || half ? 'fill-amber-400 text-amber-400' : 'text-gray-300',
              interactive && 'cursor-pointer transition-colors hover:text-amber-400'
            )}
            aria-hidden
          />
        )

        if (!interactive) {
          return (
            <span key={star} className="relative inline-flex">
              {Icon}
            </span>
          )
        }

        return (
          <button
            key={star}
            type="button"
            className="inline-flex rounded p-0.5 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            onClick={() => onChange(star)}
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
          >
            {Icon}
          </button>
        )
      })}
    </div>
  )
}
