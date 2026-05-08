import { Link, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  BarChart2,
  Bell,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  DollarSign,
  LogOut,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import AppointmentCard from '@/components/booking/AppointmentCard'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import useAuth from '@/hooks/useAuth'
import { categoryLabel } from '@/lib/businessConstants'
import { cn } from '@/lib/utils'
import { analyticsQueryKeys, getOverviewStats, getRecentActivity } from '@/services/analytics.service'
import {
  appointmentQueryKeys,
  cancelAppointment,
  getBusinessAppointments,
  getMyAppointments,
  updateAppointmentStatus,
} from '@/services/appointment.service.js'
import { businessQueryKeys, getBusinessById, getMyBusiness } from '@/services/business.service.js'
import { useChatbotStore } from '@/store/chatbotStore'

const roleLabels = {
  client: 'Client',
  owner: 'Business owner',
  admin: 'Admin',
}

function formatCurrency(value) {
  const n = Number(value) || 0
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function safeIsoDate() {
  try {
    return new Date().toISOString().split('T')[0]
  } catch {
    return ''
  }
}

function isoTimeKey(appt) {
  const d = appt?.date ? new Date(appt.date) : null
  const dateKey = d && !Number.isNaN(d.valueOf()) ? d.toISOString().slice(0, 10) : ''
  const timeKey = String(appt?.startTime ?? '')
  return `${dateKey}T${timeKey}`
}

function isConfirmedUpcoming(appt) {
  if (String(appt?.status) !== 'confirmed') return false
  const d = appt?.date ? new Date(appt.date) : null
  if (!d || Number.isNaN(d.valueOf())) return false
  const today = new Date()
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  return day >= todayUtc
}

function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-heading text-lg font-bold tracking-tight text-bookr-text">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-bookr-muted">{subtitle}</p> : null}
      </div>
      {right ? <div className="text-sm">{right}</div> : null}
    </div>
  )
}

function GradientIcon({ icon: Icon, tone = 'indigo' }) {
  const tones = {
    indigo: 'from-indigo-600 via-violet-600 to-purple-600',
    emerald: 'from-emerald-600 via-teal-600 to-indigo-600',
    violet: 'from-violet-600 via-indigo-600 to-fuchsia-600',
    purple: 'from-purple-600 via-violet-600 to-indigo-600',
  }
  return (
    <span className={cn('flex size-11 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-sm', tones[tone] ?? tones.indigo)}>
      <Icon className="size-5" aria-hidden />
    </span>
  )
}

function StatMini({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
      <p className="text-xs font-semibold tracking-wide text-white/80 uppercase">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

function StatCardLink({ to, icon: Icon, tone, label, value, isLoading }) {
  return (
    <Link
      to={to}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:border-indigo-100 hover:shadow-md'
      )}
    >
      <div className={cn('pointer-events-none absolute inset-0 bg-linear-to-br opacity-100', 'from-indigo-500/10 to-purple-500/5')} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-bookr-muted uppercase">{label}</p>
          <p className={cn('mt-2 font-heading text-3xl font-bold tracking-tight text-bookr-text', isLoading ? 'opacity-40' : '')}>
            {isLoading ? '—' : value}
          </p>
        </div>
        {Icon ? <GradientIcon icon={Icon} tone={tone} /> : null}
      </div>
      <span className="relative mt-4 block text-xs font-semibold text-indigo-700 opacity-0 transition-opacity group-hover:opacity-100">
        View insights →
      </span>
    </Link>
  )
}

function BusinessThumb({ business, idx }) {
  const img = business?.images?.[0]
  const fallback = [
    'from-indigo-100 to-purple-100',
    'from-violet-100 to-indigo-100',
    'from-purple-100 to-fuchsia-100',
  ][idx % 3]
  const initials = String(business?.name ?? 'Business')
    .trim()
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="relative size-full">
      {img ? (
        <img
          src={img}
          alt={business?.name ?? 'Business'}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none'
            e.target.nextSibling.style.display = 'flex'
          }}
        />
      ) : null}
      <div
        className={cn(
          'absolute inset-0 items-center justify-center bg-linear-to-br text-xs font-semibold text-indigo-700',
          fallback
        )}
        style={{ display: img ? 'none' : 'flex' }}
      >
        {initials}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, logout } = useAuth()
  const openChat = useChatbotStore((s) => s.openChat)

  const handleLogout = () => {
    logout()
    toast.success('Signed out')
    navigate('/login', { replace: true })
  }

  const isClient = user?.role === 'client'
  const isOwner = user?.role === 'owner'

  const myAppointmentsQuery = useQuery({
    queryKey: appointmentQueryKeys.mine({}),
    queryFn: () => getMyAppointments({}),
    enabled: Boolean(isClient),
    staleTime: 20 * 1000,
  })

  const upcomingConfirmedQuery = useQuery({
    queryKey: appointmentQueryKeys.mine({ upcoming: true, status: 'confirmed' }),
    queryFn: () => getMyAppointments({ upcoming: true, status: 'confirmed' }),
    enabled: Boolean(isClient),
    staleTime: 20 * 1000,
  })

  const myBusinessQuery = useQuery({
    queryKey: businessQueryKeys.mine,
    queryFn: getMyBusiness,
    enabled: Boolean(isOwner),
    staleTime: 30 * 1000,
  })

  const overviewQuery = useQuery({
    queryKey: analyticsQueryKeys.overview,
    queryFn: getOverviewStats,
    enabled: Boolean(isOwner),
    staleTime: 30 * 1000,
    retry: false,
  })

  const recentActivityQuery = useQuery({
    queryKey: analyticsQueryKeys.recentActivity,
    queryFn: getRecentActivity,
    enabled: Boolean(isOwner) && Boolean(myBusinessQuery.data),
    staleTime: 20 * 1000,
    retry: false,
  })

  const today = safeIsoDate()
  const todayAppointmentsQuery = useQuery({
    queryKey: appointmentQueryKeys.business({ date: today }),
    queryFn: () => getBusinessAppointments({ date: today }),
    enabled: Boolean(isOwner) && Boolean(today),
    staleTime: 10 * 1000,
  })

  const patchStatus = useMutation({
    mutationFn: ({ id, next }) => updateAppointmentStatus(id, next),
    onSuccess: async () => {
      toast.success('Appointment updated')
      await qc.invalidateQueries({ queryKey: ['appointments', 'business'] })
      await qc.invalidateQueries({ queryKey: ['analytics'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const cancelMut = useMutation({
    mutationFn: (id) => cancelAppointment(id),
    onSuccess: async () => {
      toast.success('Appointment cancelled')
      await qc.invalidateQueries({ queryKey: ['appointments', 'business'] })
      await qc.invalidateQueries({ queryKey: ['analytics'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const overview = overviewQuery.data ?? {
    totalAppointments: 0,
    totalRevenue: 0,
    completionRate: 0,
    totalUniqueClients: 0,
  }

  const clientAllAppointments = myAppointmentsQuery.data ?? []
  const clientUpcomingConfirmed = (upcomingConfirmedQuery.data ?? [])
    .filter(isConfirmedUpcoming)
    .sort((a, b) => (isoTimeKey(a) > isoTimeKey(b) ? 1 : -1))

  const nextThreeUpcoming = clientUpcomingConfirmed.slice(0, 3)

  const recentBusinesses = useMemo(() => {
    const sorted = [...clientAllAppointments].sort((a, b) => (isoTimeKey(a) < isoTimeKey(b) ? 1 : -1))
    const seen = new Set()
    const out = []
    for (const appt of sorted) {
      const biz = appt?.business
      const id = biz?._id
      if (!id) continue
      if (seen.has(id)) continue
      seen.add(id)
      out.push(biz)
      if (out.length >= 3) break
    }
    return out
  }, [clientAllAppointments])

  // Appointment rows don't include business images; hydrate from business detail endpoint for visuals.
  const recentBusinessIds = useMemo(
    () => recentBusinesses.map((b) => b?._id).filter(Boolean),
    [recentBusinesses]
  )

  const recentBusinessesDetailsQuery = useQuery({
    queryKey: ['businesses', 'recently-visited', recentBusinessIds],
    queryFn: async () => {
      const results = await Promise.allSettled(recentBusinessIds.map((id) => getBusinessById(id)))
      return results.map((r, idx) => (r.status === 'fulfilled' ? r.value : recentBusinesses[idx]))
    },
    enabled: Boolean(isClient) && recentBusinessIds.length > 0,
    staleTime: 60 * 1000,
    retry: false,
  })

  const recentBusinessesEnriched =
    recentBusinessesDetailsQuery.data?.filter(Boolean) ?? recentBusinesses

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Welcome hero */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 p-7 text-white shadow-lg sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_45%)]" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Sparkles className="size-7" aria-hidden />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-indigo-100">Welcome back</p>
                <Badge className="rounded-full border-0 bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                  {roleLabels[user?.role] ?? user?.role ?? 'Member'}
                </Badge>
              </div>
              <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">{user?.name ?? 'Bookr member'}</h1>

              {isOwner && myBusinessQuery.data?.name ? (
                <p className="mt-2 text-sm text-indigo-100">
                  Managing <span className="font-semibold text-white">{myBusinessQuery.data.name}</span>
                </p>
              ) : (
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-indigo-100">
                  Your dashboard brings appointments, insights, and smart booking into one place.
                </p>
              )}
            </div>
          </div>

          {isClient ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <StatMini label="Total Bookings" value={myAppointmentsQuery.isLoading ? '—' : String(clientAllAppointments.length)} />
              <StatMini label="Upcoming" value={upcomingConfirmedQuery.isLoading ? '—' : String(clientUpcomingConfirmed.length)} />
            </div>
          ) : isOwner ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <StatMini
                label="Total Appointments"
                value={overviewQuery.isLoading ? '—' : String(overview.totalAppointments ?? 0)}
              />
              <StatMini
                label="Total Revenue"
                value={overviewQuery.isLoading ? '—' : formatCurrency(overview.totalRevenue ?? 0)}
              />
            </div>
          ) : null}
        </div>

        <div className="relative mt-6 flex flex-wrap gap-2">
          {isClient ? (
            <>
              <Link to="/businesses" className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-indigo-700 hover:bg-white/90')}>
                Book Now
              </Link>
              <Link
                to="/dashboard/appointments"
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-white/25 bg-white/10 text-white hover:bg-white/15')}
              >
                My Appointments
              </Link>
            </>
          ) : isOwner ? (
            myBusinessQuery.data ? (
              <>
                <Link to="/dashboard/business" className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-indigo-700 hover:bg-white/90')}>
                  My Business
                </Link>
                <Link
                  to="/dashboard/business/appointments"
                  className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-white/25 bg-white/10 text-white hover:bg-white/15')}
                >
                  View Appointments
                </Link>
              </>
            ) : (
              <Link to="/dashboard/business/setup" className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-indigo-700 hover:bg-white/90')}>
                Set Up Your Business
              </Link>
            )
          ) : (
            <Link to="/businesses" className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-indigo-700 hover:bg-white/90')}>
              Browse businesses
            </Link>
          )}
        </div>
      </section>

      {/* Client dashboard */}
      {isClient ? (
        <>
          <section className="space-y-4">
            <SectionHeader
              title="Upcoming appointments"
              subtitle="Your next confirmed visits."
              right={
                <Link to="/dashboard/appointments" className="font-semibold text-indigo-700 hover:underline underline-offset-4">
                  View All
                </Link>
              }
            />

            {upcomingConfirmedQuery.isLoading ? (
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
                ))}
              </div>
            ) : !nextThreeUpcoming.length ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
                <p className="font-heading text-lg font-bold text-bookr-text">No upcoming appointments</p>
                <p className="mt-2 text-sm text-bookr-muted">Book your first one and get confirmed instantly.</p>
                <Link to="/businesses" className={cn(buttonVariants({ size: 'lg' }), 'mt-6')}>
                  Book Now
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {nextThreeUpcoming.map((appt) => (
                  <AppointmentCard key={appt._id} appointment={appt} viewType="client" />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <SectionHeader title="Recently visited" subtitle="Pick up where you left off." />

            {myAppointmentsQuery.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-44 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
                ))}
              </div>
            ) : !recentBusinesses.length ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
                <p className="font-heading text-lg font-bold text-bookr-text">Browse businesses to get started</p>
                <p className="mt-2 text-sm text-bookr-muted">Discover local pros, then rebook in seconds.</p>
                <Link to="/businesses" className={cn(buttonVariants({ size: 'lg' }), 'mt-6')}>
                  Browse
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentBusinessesEnriched.map((biz, idx) => (
                  <Card
                    key={biz._id ?? idx}
                    className="overflow-hidden border-gray-100 shadow-sm transition-all duration-200 hover:border-indigo-100 hover:shadow-md"
                  >
                    <div className="relative h-28 bg-gray-100">
                      <BusinessThumb business={biz} idx={idx} />
                      <div className="absolute inset-0 bg-linear-to-r from-indigo-950/10 via-violet-900/0 to-purple-900/15" />
                    </div>
                    <CardContent className="space-y-3 p-5">
                      <div className="space-y-1">
                        <p className="font-heading text-lg font-bold text-bookr-text">{biz.name ?? 'Business'}</p>
                        <p className="text-sm text-bookr-muted">{biz.category ? categoryLabel(biz.category) : '—'}</p>
                      </div>
                      <Link to={`/businesses/${biz._id}`} className={cn(buttonVariants({ size: 'lg' }), 'w-full justify-center')}>
                        Book Again
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <SectionHeader title="Why Bookr feels effortless" subtitle="Built for speed, clarity, and confidence." />
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'Smart Booking',
                  desc: 'AI-powered slot recommendations based on your preferences.',
                  icon: Sparkles,
                  tone: 'indigo',
                },
                {
                  title: 'Instant Confirmation',
                  desc: 'Get confirmed instantly with automated notifications.',
                  icon: CheckCircle2,
                  tone: 'emerald',
                },
                {
                  title: 'Secure Payments',
                  desc: 'Pay securely online with Stripe or pay on arrival.',
                  icon: CreditCard,
                  tone: 'violet',
                },
              ].map((f) => (
                <Card key={f.title} className="border-gray-100 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-base">
                      <GradientIcon icon={f.icon} tone={f.tone} />
                      {f.title}
                    </CardTitle>
                    <CardDescription className="text-sm">{f.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-linear-to-r from-indigo-50 via-violet-50 to-purple-50 p-6 shadow-sm sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.22),transparent_45%)]" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">
                  <Bot className="size-4" aria-hidden />
                  Meet your AI Booking Assistant
                </p>
                <p className="font-heading text-2xl font-bold tracking-tight text-bookr-text">Ask anything about businesses, services, or availability.</p>
                <p className="text-sm text-bookr-muted">Get answers fast, then book with confidence.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="lg"
                  className="gap-2"
                  onClick={async () => {
                    try {
                      await openChat(null, { openWindow: true })
                    } catch {
                      toast.error('Could not open the assistant right now.')
                    }
                  }}
                >
                  Try it now
                </Button>
                <Link to="/businesses" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'border-indigo-200')}>
                  Browse businesses
                </Link>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {/* Owner dashboard */}
      {isOwner ? (
        <>
          <section className="space-y-4">
            <SectionHeader
              title="Today’s appointments"
              subtitle="Stay ahead of your schedule."
              right={
                <Link to="/dashboard/business/appointments" className="font-semibold text-indigo-700 hover:underline underline-offset-4">
                  View All
                </Link>
              }
            />

            {todayAppointmentsQuery.isLoading ? (
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
                ))}
              </div>
            ) : !(todayAppointmentsQuery.data ?? []).length ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
                <p className="font-heading text-lg font-bold text-bookr-text">No appointments today</p>
                <p className="mt-2 text-sm text-bookr-muted">Share your business to attract clients.</p>
                <Link to="/dashboard/business" className={cn(buttonVariants({ size: 'lg' }), 'mt-6')}>
                  My Business
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {(todayAppointmentsQuery.data ?? []).map((appt) => (
                  <AppointmentCard
                    key={appt._id}
                    appointment={appt}
                    viewType="owner"
                    onComplete={() => patchStatus.mutate({ id: appt._id, next: 'completed' })}
                    onNoShow={() => patchStatus.mutate({ id: appt._id, next: 'no-show' })}
                    onCancel={() => cancelMut.mutate(appt._id)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <SectionHeader
              title="Quick stats"
              subtitle="A fast pulse check for your business."
              right={
                <Link to="/dashboard/insights" className="font-semibold text-indigo-700 hover:underline underline-offset-4">
                  View insights
                </Link>
              }
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCardLink
                to="/dashboard/insights"
                icon={CalendarDays}
                tone="indigo"
                label="Total Appointments"
                value={String(overview.totalAppointments ?? 0)}
                isLoading={overviewQuery.isLoading}
              />
              <StatCardLink
                to="/dashboard/insights"
                icon={DollarSign}
                tone="emerald"
                label="Total Revenue"
                value={formatCurrency(overview.totalRevenue ?? 0)}
                isLoading={overviewQuery.isLoading}
              />
              <StatCardLink
                to="/dashboard/insights"
                icon={TrendingUp}
                tone="violet"
                label="Completion Rate"
                value={`${Number(overview.completionRate ?? 0).toFixed(0)}%`}
                isLoading={overviewQuery.isLoading}
              />
              <StatCardLink
                to="/dashboard/insights"
                icon={Users}
                tone="purple"
                label="Unique Clients"
                value={String(overview.totalUniqueClients ?? 0)}
                isLoading={overviewQuery.isLoading}
              />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader
              title="Recent activity"
              subtitle="Latest bookings and status changes."
              right={
                <Link to="/dashboard/insights" className="font-semibold text-indigo-700 hover:underline underline-offset-4">
                  View Full Insights
                </Link>
              }
            />

            {recentActivityQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-white shadow-sm ring-1 ring-gray-100" />
                ))}
              </div>
            ) : !(recentActivityQuery.data ?? []).length ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center text-sm text-bookr-muted shadow-sm">
                No activity yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                {(recentActivityQuery.data ?? []).slice(0, 5).map((row, idx) => (
                  <div key={row._id ?? idx} className={cn('flex flex-wrap items-center justify-between gap-3 px-5 py-4', idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-bookr-text">
                        {row.clientName || 'Client'} <span className="font-normal text-bookr-muted">· {row.service || 'Service'}</span>
                      </p>
                      <p className="text-xs text-bookr-muted">
                        {row.date ? new Date(row.date).toLocaleDateString() : '—'} {row.startTime ? `· ${row.startTime}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="h-6 rounded-full border-gray-200 bg-gray-50 text-gray-700 capitalize">
                        {row.status}
                      </Badge>
                      <Badge variant="outline" className="h-6 rounded-full border-gray-200 bg-gray-50 text-gray-700 capitalize">
                        {row.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {!myBusinessQuery.isLoading && !myBusinessQuery.data ? (
            <section className="relative overflow-hidden rounded-3xl bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 p-7 text-white shadow-lg sm:p-10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_45%)]" />
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-indigo-100">You haven’t set up your business yet</p>
                  <p className="font-heading text-2xl font-bold tracking-tight text-white">Get started in minutes and start accepting bookings.</p>
                  <p className="text-sm text-indigo-100">Add services, working hours, and a cover image — Bookr handles the rest.</p>
                </div>
                <Link to="/dashboard/business/setup" className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-indigo-700 hover:bg-white/90')}>
                  Set Up Business
                </Link>
              </div>
            </section>
          ) : null}

          {!myBusinessQuery.isLoading && myBusinessQuery.data ? (
            <section className="space-y-4">
              <SectionHeader title="What your business can do on Bookr" subtitle="Designed to grow bookings and keep operations smooth." />
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    title: 'AI Insights',
                    desc: 'Get AI-powered analytics and business performance summaries.',
                    icon: BarChart2,
                    tone: 'indigo',
                  },
                  {
                    title: 'Smart Notifications',
                    desc: 'Automated personalized emails and SMS for every appointment.',
                    icon: Bell,
                    tone: 'violet',
                  },
                  {
                    title: 'Flexible Payments',
                    desc: 'Accept online payments or cash on arrival — your choice.',
                    icon: CreditCard,
                    tone: 'emerald',
                  },
                ].map((f) => (
                  <Card key={f.title} className="border-gray-100 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-base">
                        <GradientIcon icon={f.icon} tone={f.tone} />
                        {f.title}
                      </CardTitle>
                      <CardDescription className="text-sm">{f.desc}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {/* Session */}
      <Card className="border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
          <CardDescription>Sign out on shared devices when you’re finished.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/notifications"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'justify-center border-gray-200')}
            >
              Notifications
            </Link>
            <Link
              to="/businesses"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'justify-center border-indigo-200 text-indigo-700 hover:bg-indigo-50')}
            >
              Browse
            </Link>
          </div>
          <Button type="button" variant="outline" className="gap-2 border-gray-200" onClick={handleLogout}>
            <LogOut className="size-4" aria-hidden />
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
