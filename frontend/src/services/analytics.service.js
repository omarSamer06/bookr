import api from './api.js'

const pickMessage = (err) =>
  err.response?.data?.message ?? err.message ?? 'Something went wrong'

/** Stable keys keep dashboard widgets from stomping each other’s caches */
export const analyticsQueryKeys = {
  overview: ['analytics', 'overview'],
  appointmentsByPeriod: (period) => ['analytics', 'appointments-by-period', period],
  serviceBreakdown: ['analytics', 'service-breakdown'],
  busiestHours: ['analytics', 'busiest-hours'],
  clientStats: ['analytics', 'client-stats'],
  recentActivity: ['analytics', 'recent-activity'],
}

export async function getOverviewStats() {
  try {
    const { data } = await api.get('/analytics/overview')
    if (!data.success) throw new Error(data.message)
    return data.data.overview
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function getAppointmentsByPeriod(period = 'month') {
  try {
    const { data } = await api.get('/analytics/appointments-by-period', {
      params: { period },
    })
    if (!data.success) throw new Error(data.message)
    return data.data.series ?? []
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function getServiceBreakdown() {
  try {
    const { data } = await api.get('/analytics/service-breakdown')
    if (!data.success) throw new Error(data.message)
    return data.data.breakdown ?? []
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function getBusiestHours() {
  try {
    const { data } = await api.get('/analytics/busiest-hours')
    if (!data.success) throw new Error(data.message)
    return data.data.hours ?? []
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function getClientStats() {
  try {
    const { data } = await api.get('/analytics/client-stats')
    if (!data.success) throw new Error(data.message)
    return data.data ?? {}
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function getRecentActivity() {
  try {
    const { data } = await api.get('/analytics/recent-activity')
    if (!data.success) throw new Error(data.message)
    return data.data.activity ?? []
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

