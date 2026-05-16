import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  BarChart2,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Search,
  Sparkles,
  Star,
  Store,
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

function FeatureIcon({ icon: Icon }) {
  return (
    <span className="flex items-center justify-center rounded-xl bg-[#7C3AED] p-3 text-white">
      <Icon className="size-5" aria-hidden />
    </span>
  )
}

function getTimeGreeting() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getFirstName(name) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed) return 'there'
  return trimmed.split(/\s+/)[0]
}

function OwnerStatPill({ icon: Icon, value, label, isLoading }) {
  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 rounded-full border border-[#DDD6FE] bg-white px-4 py-1.5 shadow-[0_1px_3px_rgba(124,58,237,0.08)]"
        aria-hidden
      >
        <div className="size-3.5 shrink-0 animate-pulse rounded-full bg-[#EDE9FE]" />
        <div className="h-4 w-20 animate-pulse rounded bg-[#EDE9FE]" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-[#DDD6FE] bg-white px-4 py-1.5 shadow-[0_1px_3px_rgba(124,58,237,0.08)]">
      <Icon className="size-3.5 shrink-0 text-[#7C3AED]" aria-hidden />
      <span className="text-sm font-bold text-[#0F0A1E]">{value}</span>
      <span className="text-xs text-[#6B7280]">{label}</span>
    </div>
  )
}

function ClientHeroStat({ label, value, sublabel }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/12 px-6 py-4 text-center backdrop-blur-[10px]">
      <p className="mb-1 text-xs font-semibold tracking-widest text-white/60 uppercase">{label}</p>
      <p className="text-4xl leading-none font-extrabold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/50">{sublabel}</p>
    </div>
  )
}

function ClientSectionHeader({ title, to, linkLabel = 'View all →' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xl font-bold text-[#0F0A1E]">{title}</h2>
      {to ? (
        <Link to={to} className="text-sm font-semibold text-[#7C3AED] hover:text-[#6D28D9]">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  )
}

function ClientEmptyBanner({ icon: Icon, title, description, to, linkLabel }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF] px-6 py-5 sm:flex-row sm:items-center">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10">
        <Icon className="size-6 text-[#7C3AED]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[#0F0A1E]">{title}</p>
        <p className="mt-0.5 text-sm text-[#6B7280]">{description}</p>
      </div>
      <Link to={to} className="shrink-0 text-sm font-semibold text-[#7C3AED] hover:text-[#6D28D9]">
        {linkLabel}
      </Link>
    </div>
  )
}

function ClientQuickAction({ to, icon: Icon, title, description }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#7C3AED]/30 hover:shadow-md"
    >
      <span className="flex shrink-0 items-center justify-center rounded-xl bg-[#7C3AED] p-2.5 text-white">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[#0F0A1E]">{title}</p>
        <p className="mt-0.5 text-sm text-[#6B7280]">{description}</p>
      </div>
      <ArrowRight className="size-5 shrink-0 text-[#9CA3AF] transition-colors group-hover:text-[#7C3AED]" aria-hidden />
    </Link>
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

const heroPrimaryBtn =
  'inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#7C3AED] hover:bg-white/90'

export default function DashboardPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const openChat = useChatbotStore((s) => s.openChat)

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

  const clientAllAppointments = useMemo(
    () => myAppointmentsQuery.data ?? [],
    [myAppointmentsQuery.data]
  )
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
    <div
      className={cn(
        'mx-auto max-w-7xl',
        isClient
          ? 'space-y-6 bg-[#FAFAFA] -mx-4 -mt-4 min-h-full px-4 pt-4 pb-6 sm:-mx-6 sm:px-6'
          : isOwner
            ? 'space-y-6'
            : 'space-y-8'
      )}
    >
      {isClient ? (
        <section
          className="relative min-h-[200px] overflow-hidden rounded-3xl bg-[#7C3AED] px-6 py-10 text-white sm:px-12 sm:py-10"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at top right, rgba(167,139,250,0.4) 0%, transparent 60%), radial-gradient(ellipse at bottom left, rgba(109,40,217,0.6) 0%, transparent 50%)',
          }}
        >
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-white/60" aria-hidden />
                <p className="text-sm text-white/60">Welcome back</p>
              </div>
              <h1 className="mt-1 text-[2.5rem] leading-tight font-extrabold tracking-[-0.02em] text-white">
                {user?.name ?? 'Bookr member'}
              </h1>
              <p className="mt-2 text-sm text-white/60">Ready to book your next appointment?</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/businesses"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-[#7C3AED] shadow-md transition-all hover:bg-white/90"
                >
                  Book Now
                </Link>
                <Link
                  to="/dashboard/appointments"
                  className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/15 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/25"
                >
                  My Appointments
                </Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="grid w-full max-w-sm grid-cols-2 gap-3 sm:max-w-none">
                <ClientHeroStat
                  label="Total Bookings"
                  value={myAppointmentsQuery.isLoading ? '—' : String(clientAllAppointments.length)}
                  sublabel="total"
                />
                <ClientHeroStat
                  label="Upcoming"
                  value={upcomingConfirmedQuery.isLoading ? '—' : String(clientUpcomingConfirmed.length)}
                  sublabel="confirmed"
                />
              </div>
            </div>
          </div>
        </section>
      ) : isOwner ? (
        <header className="relative -mx-4 -mt-4 overflow-hidden rounded-b-[20px] border-b border-[#DDD6FE] bg-[linear-gradient(135deg,#F5F3FF_0%,#EDE9FE_100%)] px-8 py-6 sm:-mx-6">
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 left-0 w-1 rounded-r bg-[#7C3AED]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-10 -right-10 size-[180px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.08)_0%,transparent_70%)]"
          />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 pl-2">
              <h1 className="font-heading text-2xl font-bold text-[#0F0A1E]">
                {getTimeGreeting()}, {getFirstName(user?.name)}
              </h1>
              <p className="mt-0.5 text-sm font-medium text-[#7C3AED]">
                Managing {myBusinessQuery.data?.name ?? 'your business'}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="hidden flex-wrap items-center gap-3 md:flex">
              <OwnerStatPill
                icon={CalendarDays}
                value={String(overview.totalAppointments ?? 0)}
                label="Appointments"
                isLoading={overviewQuery.isLoading}
              />
              <OwnerStatPill
                icon={DollarSign}
                value={formatCurrency(overview.totalRevenue ?? 0)}
                label="Revenue"
                isLoading={overviewQuery.isLoading}
              />
              <OwnerStatPill
                icon={Users}
                value={String(overview.totalUniqueClients ?? 0)}
                label="Clients"
                isLoading={overviewQuery.isLoading}
              />
            </div>

            <div className="mx-1 hidden h-6 w-px bg-[#DDD6FE] md:block" aria-hidden />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Link
                to={myBusinessQuery.data ? '/dashboard/business' : '/dashboard/business/setup'}
                className="inline-flex items-center justify-center rounded-xl border border-[#7C3AED]/30 bg-white px-4 py-2 text-sm font-semibold text-[#7C3AED] shadow-sm transition-all hover:border-[#7C3AED] hover:shadow-md"
              >
                My Business
              </Link>
              <Link
                to="/dashboard/business/appointments"
                className="inline-flex items-center justify-center rounded-xl bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#6D28D9] hover:shadow-md"
              >
                View Appointments
              </Link>
            </div>
          </div>
          </div>
        </header>
      ) : (
      <section className="relative overflow-hidden rounded-3xl bg-[#7C3AED] p-7 text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1),inset_0_0_120px_rgba(0,0,0,0.15)] sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08)_0%,transparent_60%)]" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Sparkles className="size-7" aria-hidden />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-white/75">Welcome back</p>
                <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium text-white">
                  {roleLabels[user?.role] ?? user?.role ?? 'Member'}
                </span>
              </div>
              <h1 className="mt-2 font-heading text-3xl font-bold text-white">{user?.name ?? 'Bookr member'}</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/65">
                Your dashboard brings appointments, insights, and smart booking into one place.
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap gap-2">
          <Link to="/businesses" className={heroPrimaryBtn}>
            Browse businesses
          </Link>
        </div>
      </section>
      )}

      {isClient ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <ClientQuickAction to="/businesses" icon={Search} title="Find a Business" description="Browse all services" />
            <ClientQuickAction
              to="/dashboard/appointments"
              icon={CalendarDays}
              title="My Schedule"
              description="View upcoming visits"
            />
            <ClientQuickAction to="/dashboard/reviews" icon={Star} title="My Reviews" description="See your feedback" />
          </section>

          <section className="space-y-4">
            <ClientSectionHeader title="Upcoming" to="/dashboard/appointments" />

            {upcomingConfirmedQuery.isLoading ? (
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
                ))}
              </div>
            ) : !nextThreeUpcoming.length ? (
              <ClientEmptyBanner
                icon={CalendarDays}
                title="No upcoming appointments"
                description="Book a service to get started"
                to="/businesses"
                linkLabel="Book Now →"
              />
            ) : (
              <div className="grid gap-4">
                {nextThreeUpcoming.map((appt) => (
                  <AppointmentCard key={appt._id} appointment={appt} viewType="client" />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <ClientSectionHeader title="Recently Visited Businesses" to="/businesses" linkLabel="Browse →" />

            {myAppointmentsQuery.isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-44 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
                ))}
              </div>
            ) : !recentBusinesses.length ? (
              <ClientEmptyBanner
                icon={Store}
                title="No recent businesses"
                description="Browse businesses to get started"
                to="/businesses"
                linkLabel="Browse →"
              />
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
            <h2 className="text-xl font-bold text-[#0F0A1E]">Why Bookr feels effortless</h2>
            <div className="rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF] p-8">
              <div className="grid gap-8 md:grid-cols-3 md:gap-0">
                {[
                  {
                    title: 'Smart Booking',
                    desc: 'AI-powered slot recommendations based on your preferences.',
                    icon: Sparkles,
                  },
                  {
                    title: 'Instant Confirmation',
                    desc: 'Get confirmed instantly with automated notifications.',
                    icon: CheckCircle2,
                  },
                  {
                    title: 'Secure Payments',
                    desc: 'Pay securely online with Stripe or pay on arrival.',
                    icon: CreditCard,
                  },
                ].map((f, idx) => (
                  <div
                    key={f.title}
                    className={cn(
                      'md:px-8',
                      idx > 0 && 'border-t border-[#DDD6FE] pt-8 md:border-t-0 md:border-l md:pt-0'
                    )}
                  >
                    <FeatureIcon icon={f.icon} />
                    <p className="mt-3 font-bold text-[#0F0A1E]">{f.title}</p>
                    <p className="mt-1 text-sm text-[#6B7280]">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-[#7C3AED] px-8 py-8 sm:px-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Bot className="size-4 text-white/60" aria-hidden />
                  <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">AI Powered</p>
                </div>
                <h2 className="mt-2 text-2xl font-bold text-white">Meet your Booking Assistant</h2>
                <p className="mt-1 text-sm text-white/60">Ask anything — services, availability, or pricing</p>
              </div>
              <Button
                type="button"
                className="shrink-0 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-[#7C3AED] shadow-md hover:bg-white/90"
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
                  },
                  {
                    title: 'Smart Notifications',
                    desc: 'Automated personalized emails and SMS for every appointment.',
                    icon: Bell,
                  },
                  {
                    title: 'Flexible Payments',
                    desc: 'Accept online payments or cash on arrival — your choice.',
                    icon: CreditCard,
                  },
                ].map((f) => (
                  <Card key={f.title} className="border-gray-100 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-base">
                        <FeatureIcon icon={f.icon} />
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

    </div>
  )
}
