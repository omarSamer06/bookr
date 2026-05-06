import api from './api.js'

const pickMessage = (err) =>
  err.response?.data?.message ?? err.message ?? 'Something went wrong'

/** Stable React Query roots keep slot caches scoped per service/day selection */
export const appointmentQueryKeys = {
  slots: (businessId, date, serviceId) => ['appointments', 'slots', businessId, date, serviceId],
  mine: (filters) => ['appointments', 'mine', filters],
  business: (filters) => ['appointments', 'business', filters],
  detail: (id) => ['appointments', 'detail', id],
}

/** Public availability powers BookingPage before any write calls need auth */
export async function getAvailableSlots(businessId, date, serviceId) {
  try {
    const { data } = await api.get('/appointments/slots', {
      params: { businessId, date, serviceId },
    })
    if (!data.success) throw new Error(data.message)
    return data.data.slots ?? []
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

/** Creates a booking row with a frozen service snapshot on the server */
export async function createAppointment(payload) {
  try {
    const { data } = await api.post('/appointments', payload)
    if (!data.success) throw new Error(data.message)
    return data.data.appointment
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

/** Lists what the JWT identifies as “my” bookings without trusting ids from the UI */
export async function getMyAppointments(filters = {}) {
  try {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.upcoming === true) params.upcoming = true
    const { data } = await api.get('/appointments/my', { params })
    if (!data.success) throw new Error(data.message)
    return data.data.appointments ?? []
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

/** Owner roster pulls via owner JWT so tenants never guess competitor appointment ids */
export async function getBusinessAppointments(filters = {}) {
  try {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.date) params.date = filters.date
    if (filters.upcoming === true) params.upcoming = true
    const { data } = await api.get('/appointments/business', { params })
    if (!data.success) throw new Error(data.message)
    return data.data.appointments ?? []
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

/** Detail gate still happens server-side — client uses this only after authorization succeeds */
export async function getAppointmentById(id) {
  try {
    const { data } = await api.get(`/appointments/${id}`)
    if (!data.success) throw new Error(data.message)
    return data.data.appointment
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

/** Operational transitions reuse PATCH contract instead of ad hoc verbs */
export async function updateAppointmentStatus(id, status) {
  try {
    const { data } = await api.patch(`/appointments/${id}/status`, { status })
    if (!data.success) throw new Error(data.message)
    return data.data.appointment
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

/** Explicit cancel endpoint avoids ambiguous deletes while preserving audit columns server-side */
export async function cancelAppointment(id) {
  try {
    const { data } = await api.patch(`/appointments/${id}/cancel`)
    if (!data.success) throw new Error(data.message)
    return data.data.appointment
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

/** Moves bookings forward without cloning rows so histories stay anchored to one id */
export async function rescheduleAppointment(id, payload) {
  try {
    const { data } = await api.patch(`/appointments/${id}/reschedule`, payload)
    if (!data.success) throw new Error(data.message)
    return data.data.appointment
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}
