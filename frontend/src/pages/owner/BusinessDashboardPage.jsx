import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Building2, CalendarDays, Coffee, Image as ImageIcon, Plus, Sparkles } from 'lucide-react'
import BusinessInfoForm from '@/components/business/BusinessInfoForm'
import ImageUploader from '@/components/business/ImageUploader'
import ServiceCard from '@/components/business/ServiceCard'
import ServiceForm from '@/components/business/ServiceForm'
import WorkingHoursForm from '@/components/business/WorkingHoursForm'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WEEKDAYS, categoryLabel } from '@/lib/businessConstants'
import { cn } from '@/lib/utils'
import {
  addService,
  businessQueryKeys,
  deleteService,
  getMyBusiness,
  updateBusiness,
  updateService,
} from '@/services/business.service.js'

function invalidateBusinessQueries(qc, businessId) {
  qc.invalidateQueries({ queryKey: businessQueryKeys.mine })
  qc.invalidateQueries({ queryKey: ['businesses', 'list'] })
  if (businessId) {
    qc.invalidateQueries({ queryKey: businessQueryKeys.detail(businessId) })
  }
}

/** Owner cockpit grouped by concern so mutations stay localized per workflow */
export default function BusinessDashboardPage() {
  const qc = useQueryClient()
  const { data: business, isLoading } = useQuery({
    queryKey: businessQueryKeys.mine,
    queryFn: getMyBusiness,
    staleTime: 30 * 1000,
  })

  const [infoOpen, setInfoOpen] = useState(false)
  const [svcOpen, setSvcOpen] = useState(false)
  const [svcMode, setSvcMode] = useState('add')
  const [svcEditing, setSvcEditing] = useState(null)

  const [breakRows, setBreakRows] = useState([])

  const breaksSig =
    business?._id != null ? `${business._id}:${JSON.stringify(business.breaks ?? [])}` : ''
  const [prevBreaksSig, setPrevBreaksSig] = useState('')
  if (business && breaksSig !== prevBreaksSig) {
    setPrevBreaksSig(breaksSig)
    const raw = business.breaks
    if (!raw?.length) setBreakRows([])
    else setBreakRows(raw.map((b) => ({ ...b })))
  }

  const updateMutation = useMutation({
    mutationFn: updateBusiness,
    onSuccess: (data) => {
      invalidateBusinessQueries(qc, data?._id)
    },
    onError: (err) => toast.error(err.message),
  })

  const addSvcMutation = useMutation({
    mutationFn: addService,
    onSuccess: () => {
      toast.success('Service added')
      invalidateBusinessQueries(qc, business?._id)
      setSvcOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const patchSvcMutation = useMutation({
    mutationFn: ({ id, payload }) => updateService(id, payload),
    onSuccess: () => {
      toast.success('Service updated')
      invalidateBusinessQueries(qc, business?._id)
      setSvcOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const delSvcMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      toast.success('Service removed')
      invalidateBusinessQueries(qc, business?._id)
    },
    onError: (err) => toast.error(err.message),
  })

  const handleInfoSubmit = (payload) => {
    updateMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Business profile updated')
        setInfoOpen(false)
      },
    })
  }

  const handleHoursSubmit = ({ workingHours, slotDuration }) => {
    updateMutation.mutate(
      { workingHours, slotDuration },
      {
        onSuccess: () => toast.success('Schedule saved'),
      }
    )
  }

  const saveBreaks = () => {
    const cleaned = breakRows
      .filter((r) => r.name?.trim() && r.start && r.end)
      .map((r) => ({
        name: r.name.trim(),
        start: r.start,
        end: r.end,
      }))
    updateMutation.mutate(
      { breaks: cleaned },
      {
        onSuccess: () => toast.success('Breaks saved'),
      }
    )
  }

  const openAddService = () => {
    setSvcMode('add')
    setSvcEditing(null)
    setSvcOpen(true)
  }

  const openEditService = (service) => {
    setSvcMode('edit')
    setSvcEditing(service)
    setSvcOpen(true)
  }

  const handleServiceSubmit = (id, payload) => {
    if (id) patchSvcMutation.mutate({ id, payload })
    else addSvcMutation.mutate(payload)
  }

  if (isLoading || !business) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
      </div>
    )
  }

  const openDays = WEEKDAYS.filter(({ key }) => {
    const d = business.workingHours?.[key]
    return d && !d.isOff
  }).length

  const statCards = [
    {
      label: 'Total services',
      value: (business.services ?? []).length,
      icon: Sparkles,
      accent: 'from-indigo-500/15 to-purple-500/10',
    },
    {
      label: 'Working days',
      value: openDays,
      icon: CalendarDays,
      accent: 'from-violet-500/15 to-indigo-500/10',
    },
    {
      label: 'Breaks',
      value: (business.breaks ?? []).length,
      icon: Coffee,
      accent: 'from-purple-500/15 to-fuchsia-500/10',
    },
    {
      label: 'Images',
      value: (business.images ?? []).length,
      icon: ImageIcon,
      accent: 'from-indigo-500/15 to-sky-500/10',
    },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/60">
              <Building2 className="size-6" aria-hidden />
            </span>
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight text-bookr-text">{business.name}</h1>
              <p className="text-sm font-medium text-indigo-700">{categoryLabel(business.category)}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/dashboard/business/appointments" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}>
            Appointments
          </Link>
          <Link to={`/businesses/${business._id}`} className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-indigo-200')}>
            View public profile
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={cn(
              'relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:border-indigo-100 hover:shadow-md'
            )}
          >
            <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100', s.accent)} />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-bookr-muted uppercase">{s.label}</p>
                <p className="mt-2 font-heading text-3xl font-bold text-bookr-text">{s.value}</p>
              </div>
              <s.icon className="size-6 text-indigo-600" aria-hidden />
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="overview" className="gap-6">
        <TabsList variant="line" className="w-full flex-wrap justify-start gap-1 border-b border-gray-100">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="hours">Working hours</TabsTrigger>
          <TabsTrigger value="breaks">Breaks</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl space-y-3 text-sm leading-relaxed text-bookr-muted">
                <p className="text-bookr-text">{business.description || 'No description yet.'}</p>
                <Separator className="bg-gray-100" />
                <p>
                  <span className="font-semibold text-bookr-text">Location:</span>{' '}
                  {[business.location?.address, business.location?.city, business.location?.country]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </p>
                <p>
                  <span className="font-semibold text-bookr-text">Phone:</span> {business.phone || '—'}
                </p>
                <p>
                  <span className="font-semibold text-bookr-text">Website:</span>{' '}
                  {business.website ? (
                    <a href={business.website} className="text-indigo-600 underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                      {business.website}
                    </a>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setInfoOpen(true)}>
                Edit profile
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" className="gap-2" size="lg" onClick={openAddService}>
              <Plus className="size-4" aria-hidden />
              Add service
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {(business.services ?? []).map((s) => (
              <ServiceCard
                key={s._id}
                service={s}
                onEdit={openEditService}
                onDelete={(svc) => {
                  if (window.confirm(`Remove service “${svc.name}”?`)) {
                    delSvcMutation.mutate(svc._id)
                  }
                }}
              />
            ))}
          </div>
          {!business.services?.length ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center text-sm text-bookr-muted shadow-sm">
              No services yet — add what clients can book.
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="hours">
          <div className="rounded-2xl border border-gray-100 bg-white p-2 shadow-sm sm:p-4">
            <WorkingHoursForm
              initialWorkingHours={business.workingHours}
              initialSlotDuration={business.slotDuration}
              isPending={updateMutation.isPending}
              onSubmit={handleHoursSubmit}
            />
          </div>
        </TabsContent>

        <TabsContent value="breaks" className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="text-sm text-bookr-muted">
              Block lunch or buffers so automated scheduling doesn’t collide with reality.
            </p>
            <div className="mt-6 space-y-3">
              {breakRows.map((row, idx) => (
                <div
                  key={idx}
                  className="grid gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <div className="grid gap-1">
                    <Label htmlFor={`bn-${idx}`}>Label</Label>
                    <Input
                      id={`bn-${idx}`}
                      value={row.name}
                      onChange={(e) => {
                        const next = [...breakRows]
                        next[idx] = { ...next[idx], name: e.target.value }
                        setBreakRows(next)
                      }}
                      placeholder="Lunch"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`bs-${idx}`}>Start</Label>
                    <Input
                      id={`bs-${idx}`}
                      type="time"
                      value={row.start}
                      onChange={(e) => {
                        const next = [...breakRows]
                        next[idx] = { ...next[idx], start: e.target.value }
                        setBreakRows(next)
                      }}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`be-${idx}`}>End</Label>
                    <Input
                      id={`be-${idx}`}
                      type="time"
                      value={row.end}
                      onChange={(e) => {
                        const next = [...breakRows]
                        next[idx] = { ...next[idx], end: e.target.value }
                        setBreakRows(next)
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => setBreakRows(breakRows.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBreakRows([...breakRows, { name: '', start: '12:00', end: '13:00' }])}
              >
                Add break
              </Button>
              <Button type="button" disabled={updateMutation.isPending} onClick={saveBreaks}>
                Save breaks
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="images">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <ImageUploader business={business} />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit business</DialogTitle>
            <DialogDescription>Updates sync instantly for clients browsing Bookr.</DialogDescription>
          </DialogHeader>
          <BusinessInfoForm
            initialValues={business}
            submitLabel="Save changes"
            isPending={updateMutation.isPending}
            onSubmit={handleInfoSubmit}
          />
        </DialogContent>
      </Dialog>

      <ServiceForm
        open={svcOpen}
        onOpenChange={setSvcOpen}
        mode={svcMode}
        service={svcEditing}
        isPending={addSvcMutation.isPending || patchSvcMutation.isPending}
        onSubmit={handleServiceSubmit}
      />
    </div>
  )
}
