import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function RecommendationBanner({ className }) {
  const [open, setOpen] = useState(true)
  if (!open) return null

  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 shadow-sm',
        className
      )}
    >
      <p className="leading-relaxed">
        <span className="font-semibold">✨ We’ve highlighted the best slots</span> based on your booking history.
      </p>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-xl p-1 text-indigo-700 hover:bg-indigo-100"
        aria-label="Dismiss"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}

