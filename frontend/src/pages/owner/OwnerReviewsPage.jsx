import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import ReviewsList from '@/components/reviews/ReviewsList'
import { buttonVariants } from '@/components/ui/button'
import { businessQueryKeys, getMyBusiness } from '@/services/business.service.js'
import { cn } from '@/lib/utils'

/** Owner view of customer reviews on their business */
export default function OwnerReviewsPage() {
  const { data: business, isLoading, isError, error } = useQuery({
    queryKey: businessQueryKeys.mine,
    queryFn: getMyBusiness,
    staleTime: 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse space-y-4" aria-hidden>
        <div className="h-10 w-48 rounded bg-gray-100" />
        <div className="h-64 rounded-2xl bg-gray-50" />
      </div>
    )
  }

  if (isError || !business) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center text-sm text-red-600">
        {error?.message ?? 'Business not found.'}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-bookr-text">Reviews</h1>
          <p className="mt-2 text-sm text-bookr-muted">Read and reply to feedback from your clients.</p>
        </div>
        <Link
          to={`/businesses/${business._id}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'border-indigo-200 text-indigo-700')}
        >
          View public page
        </Link>
      </div>
      <ReviewsList businessId={business._id} isOwner />
    </div>
  )
}
