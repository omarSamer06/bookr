import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import StatCard from '@/components/dashboard/StatCard'
import AppointmentsChart from '@/components/dashboard/AppointmentsChart'
import ServicePieChart from '@/components/dashboard/ServicePieChart'
import BusiestHoursChart from '@/components/dashboard/BusiestHoursChart'
import ClientStatsCard from '@/components/dashboard/ClientStatsCard'
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed'
import {
  analyticsQueryKeys,
  getAppointmentsByPeriod,
  getBusiestHours,
  getClientStats,
  getOverviewStats,
  getRecentActivity,
  getServiceBreakdown,
} from '@/services/analytics.service'

function formatCurrency(value) {
  const n = Number(value) || 0
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function formatPercent(value) {
  const n = Number(value) || 0
  return `${n.toFixed(0)}%`
}

export default function InsightsDashboardPage() {
  const [period, setPeriod] = useState('month')

  const periodOptions = useMemo(
    () => [
      { key: 'week', label: 'Week' },
      { key: 'month', label: 'Month' },
      { key: 'year', label: 'Year' },
    ],
    []
  )

  const overviewQuery = useQuery({
    queryKey: analyticsQueryKeys.overview,
    queryFn: getOverviewStats,
    staleTime: 30 * 1000,
  })

  const seriesQuery = useQuery({
    queryKey: analyticsQueryKeys.appointmentsByPeriod(period),
    queryFn: () => getAppointmentsByPeriod(period),
    staleTime: 30 * 1000,
  })

  const serviceQuery = useQuery({
    queryKey: analyticsQueryKeys.serviceBreakdown,
    queryFn: getServiceBreakdown,
    staleTime: 60 * 1000,
  })

  const hoursQuery = useQuery({
    queryKey: analyticsQueryKeys.busiestHours,
    queryFn: getBusiestHours,
    staleTime: 60 * 1000,
  })

  const clientsQuery = useQuery({
    queryKey: analyticsQueryKeys.clientStats,
    queryFn: getClientStats,
    staleTime: 60 * 1000,
  })

  const activityQuery = useQuery({
    queryKey: analyticsQueryKeys.recentActivity,
    queryFn: getRecentActivity,
    staleTime: 20 * 1000,
  })

  const overview = overviewQuery.data

  const statCards = [
    {
      title: 'Total Appointments',
      value: overview ? String(overview.totalAppointments ?? 0) : '—',
      subtitle: 'All time',
      icon: CalendarDays,
    },
    {
      title: 'Total Revenue',
      value: overview ? formatCurrency(overview.totalRevenue ?? 0) : '—',
      subtitle: 'Paid appointments',
      icon: DollarSign,
    },
    {
      title: 'Completion Rate',
      value: overview ? formatPercent(overview.completionRate ?? 0) : '—',
      subtitle: 'Completed / non-cancelled',
      icon: CheckCircle2,
    },
    {
      title: 'No-show Rate',
      value: overview ? formatPercent(overview.noShowRate ?? 0) : '—',
      subtitle: 'No-show / non-cancelled',
      icon: XCircle,
    },
    {
      title: 'Unique Clients',
      value: overview ? String(overview.totalUniqueClients ?? 0) : '—',
      subtitle: 'All time',
      icon: Users,
    },
    {
      title: 'Avg Appointment Value',
      value: overview ? formatCurrency(overview.averageAppointmentValue ?? 0) : '—',
      subtitle: 'Paid appointments',
      icon: TrendingUp,
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-bookr-text">Business Insights</h1>
          <p className="text-sm text-bookr-muted">Performance stats scoped to your business.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger size="sm" className="min-w-32">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent align="end">
              {periodOptions.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {overviewQuery.isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[116px] animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
            ))
          : statCards.map((c) => <StatCard key={c.title} {...c} />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AppointmentsChart
            period={period}
            onPeriodChange={setPeriod}
            data={seriesQuery.data}
            isLoading={seriesQuery.isLoading}
          />
        </div>
        <div className="lg:col-span-1">
          <ServicePieChart data={serviceQuery.data} isLoading={serviceQuery.isLoading} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BusiestHoursChart data={hoursQuery.data} isLoading={hoursQuery.isLoading} />
        <ClientStatsCard data={clientsQuery.data} isLoading={clientsQuery.isLoading} />
      </div>

      <RecentActivityFeed data={activityQuery.data} isLoading={activityQuery.isLoading} />
    </div>
  )
}

