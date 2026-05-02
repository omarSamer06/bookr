import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Building2, Plus } from 'lucide-react'
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
import { categoryLabel } from '@/lib/businessConstants'
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

  useEffect(() => {
    const raw = business?.breaks
    if (!raw?.length) {
      setBreakRows([])
      return
    }
    setBreakRows(raw.map((b) => ({ ...b })))
  }, [business?._id, JSON.stringify(business?.breaks ?? [])])

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
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading business…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Building2 className="size-6 text-primary" aria-hidden />
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{business.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{categoryLabel(business.category)}</p>
        </div>
        <Link
          to={`/businesses/${business._id}`}
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          View public profile
        </Link>
      </div>

      <Tabs defaultValue="overview" className="gap-6">
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="hours">Working hours</TabsTrigger>
          <TabsTrigger value="breaks">Breaks</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="rounded-xl border border-border/80 bg-card/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2 text-sm">
                <p>{business.description || 'No description yet.'}</p>
                <Separator />
                <p>
                  <span className="text-muted-foreground">Location:</span>{' '}
                  {[business.location?.address, business.location?.city, business.location?.country]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Phone:</span> {business.phone || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Website:</span>{' '}
                  {business.website ? (
                    <a href={business.website} className="text-primary underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
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
            <Button type="button" className="gap-2" onClick={openAddService}>
              <Plus className="size-4" aria-hidden />
              Add service
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
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
            <p className="text-sm text-muted-foreground">No services yet — add what clients can book.</p>
          ) : null}
        </TabsContent>

        <TabsContent value="hours">
          <WorkingHoursForm
            initialWorkingHours={business.workingHours}
            initialSlotDuration={business.slotDuration}
            isPending={updateMutation.isPending}
            onSubmit={handleHoursSubmit}
          />
        </TabsContent>

        <TabsContent value="breaks" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Block lunch or buffers so automated scheduling doesn’t collide with reality.
          </p>
          <div className="space-y-3">
            {breakRows.map((row, idx) => (
              <div key={idx} className="grid gap-3 rounded-lg border border-border/70 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
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
                    className="text-destructive"
                    onClick={() => setBreakRows(breakRows.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
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
        </TabsContent>

        <TabsContent value="images">
          <ImageUploader business={business} />
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
