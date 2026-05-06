import api from './api.js'

const pickMessage = (err) =>
  err.response?.data?.message ?? err.message ?? 'Something went wrong'

/** Keeps notification caches stable per account so a logout/login swap never replays stale rows */
export const notificationQueryKeys = {
  mine: (userId) => ['notifications', 'mine', userId],
  appointment: (appointmentId) => ['notifications', 'appointment', appointmentId],
}

/** Loads the signed-in user’s notification inbox (newest first) */
export async function getMyNotifications() {
  try {
    const { data } = await api.get('/notifications/my')
    if (!data.success) throw new Error(data.message)
    return data.data.notifications ?? []
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

/** Loads notifications for one booking after server-side appointment ACL checks */
export async function getAppointmentNotifications(appointmentId) {
  try {
    const { data } = await api.get(`/notifications/appointment/${appointmentId}`)
    if (!data.success) throw new Error(data.message)
    return data.data.notifications ?? []
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}
