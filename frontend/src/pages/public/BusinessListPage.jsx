import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, MapPin, Search } from 'lucide-react'
import RatingBadge from '@/components/reviews/RatingBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BUSINESS_CATEGORIES, categoryLabel } from '@/lib/businessConstants'
import { cn } from '@/lib/utils'
import { businessQueryKeys, getBusinesses } from '@/services/business.service.js'

function BusinessListSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="aspect-[16/10] animate-pulse bg-gray-100" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-48 max-w-full animate-pulse rounded-lg bg-gray-100" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-gray-50" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Keeps filter primitives stable so TanStack Query dedupes identical lists server-side */
export default function BusinessListPage() {
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [search, setSearch] = useState('')

  const filters = useMemo(
    () => ({
      ...(category ? { category } : {}),
      ...(city.trim() ? { city: city.trim() } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
    [category, city, search]
  )

  const { data: businesses = [], isLoading, isError, error } = useQuery({
    queryKey: businessQueryKeys.list(filters),
    queryFn: () => getBusinesses(filters),
    staleTime: 60 * 1000,
  })

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl space-y-3">
        <h1 className="font-heading text-4xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
            Browse businesses
          </span>
        </h1>
        <p className="text-lg leading-relaxed text-bookr-muted">
          Discover salons, clinics, studios, and consultants — filter by what matters to you.
        </p>
      </div>

      <Card className="border-gray-100 shadow-sm">
        <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="grid min-w-0 flex-1 gap-2 md:min-w-[200px]">
            <Label htmlFor="flt-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-3 left-3 size-4 text-bookr-muted" />
              <Input
                id="flt-search"
                className="pl-10"
                placeholder="Name or keywords"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="grid min-w-0 gap-2 md:min-w-[180px]">
            <Label htmlFor="flt-category">Category</Label>
            <select
              id="flt-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={cn(
                'flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-bookr-text shadow-sm outline-none transition-all',
                'focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-300/80'
              )}
            >
              <option value="">All categories</option>
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid min-w-0 flex-1 gap-2 md:min-w-[180px]">
            <Label htmlFor="flt-city">City</Label>
            <Input id="flt-city" placeholder="e.g. Austin" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => {
              setCategory('')
              setCity('')
              setSearch('')
            }}
          >
            Reset filters
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <BusinessListSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50/50 px-6 py-16 text-center">
          <p className="text-sm font-medium text-red-700">{error.message}</p>
        </div>
      ) : businesses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <Building2 className="mb-4 size-12 text-indigo-300" aria-hidden />
          <p className="font-heading text-lg font-bold text-bookr-text">No matches yet</p>
          <p className="mt-2 max-w-md text-sm text-bookr-muted">Try widening your search or clearing filters to see more businesses.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <Link key={b._id} to={`/businesses/${b._id}`} className="group block">
              <Card className="h-full overflow-hidden border-gray-100 transition-all duration-200 hover:border-indigo-100 hover:shadow-md">
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                  {b.images?.[0] ? (
                    <>
                      <img src={b.images[0]} alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/70 via-indigo-900/20 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2">
                        <Badge className="rounded-full border-0 bg-white/95 px-3 py-1 text-xs font-semibold text-indigo-800 shadow-sm backdrop-blur-sm">
                          {categoryLabel(b.category)}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-2 text-bookr-muted">
                      <Building2 className="size-10 opacity-40" aria-hidden />
                      <span className="text-xs font-medium">No image</span>
                    </div>
                  )}
                </div>
                <CardContent className="space-y-3 p-5 pt-5">
                  <h2 className="font-heading text-lg font-bold text-bookr-text group-hover:text-indigo-700">{b.name}</h2>
                  <RatingBadge
                    rating={b.averageRating}
                    totalReviews={b.totalReviews}
                    size="sm"
                  />
                  <p className="flex items-center gap-2 text-sm text-bookr-muted">
                    <MapPin className="size-4 shrink-0 text-indigo-400" aria-hidden />
                    {b.location?.city || 'City TBD'}
                    {b.location?.country ? ` · ${b.location.country}` : ''}
                  </p>
                  <div className="flex items-center justify-end gap-3 pt-1">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                      {(b.services ?? []).filter((s) => s.isActive !== false).length} services
                    </span>
                  </div>
                  <span className="inline-flex w-full items-center justify-center rounded-xl border border-indigo-200 bg-white py-2.5 text-sm font-semibold text-indigo-700 transition-colors group-hover:bg-indigo-50">
                    View & book
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
