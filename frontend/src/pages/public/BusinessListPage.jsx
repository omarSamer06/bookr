import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BUSINESS_CATEGORIES, categoryLabel } from '@/lib/businessConstants'
import { cn } from '@/lib/utils'
import { businessQueryKeys, getBusinesses } from '@/services/business.service.js'

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
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Browse businesses</h1>
        <p className="text-muted-foreground">
          Discover salons, clinics, studios, and consultants on Bookr.
        </p>
      </div>

      <Card className="border-border/80">
        <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:flex-wrap md:items-end">
          <div className="grid flex-1 gap-2 md:min-w-[200px]">
            <Label htmlFor="flt-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <Input
                id="flt-search"
                className="pl-9"
                placeholder="Name or keywords"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2 md:min-w-[160px]">
            <Label htmlFor="flt-category">Category</Label>
            <select
              id="flt-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={cn(
                'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none',
                'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30'
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
          <div className="grid flex-1 gap-2 md:min-w-[160px]">
            <Label htmlFor="flt-city">City</Label>
            <Input
              id="flt-city"
              placeholder="e.g. Austin"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
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
        <p className="text-sm text-muted-foreground">Loading businesses…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : businesses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matches yet — widen your filters.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <Link key={b._id} to={`/businesses/${b._id}`} className="group block">
              <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
                <div className="aspect-16/10 overflow-hidden bg-muted">
                  {b.images?.[0] ? (
                    <img src={b.images[0]} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-lg font-medium">{b.name}</h2>
                    <Badge variant="secondary">{categoryLabel(b.category)}</Badge>
                  </div>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    {b.location?.city || 'City TBD'}
                    {b.location?.country ? ` · ${b.location.country}` : ''}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
