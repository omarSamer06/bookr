import api from './api.js'

const pickMessage = (err) =>
  err.response?.data?.message ?? err.message ?? 'Something went wrong'

/** Mirrors the guarded PaymentIntent creation route so Elements never guesses amounts client-side */
export async function createPaymentIntent(data) {
  try {
    const { data: res } = await api.post('/payments/create-intent', data)
    if (!res.success) throw new Error(res.message)
    return res.data
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

/** Owner-initiated clawbacks piggyback on the same JWT gate as calendar mutations */
export async function refundPayment(appointmentId) {
  try {
    const { data: res } = await api.post(`/payments/refund/${appointmentId}`)
    if (!res.success) throw new Error(res.message)
    return res.data.appointment
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function markAsPaid(appointmentId) {
  try {
    const { data: res } = await api.patch(`/payments/mark-paid/${appointmentId}`)
    if (!res.success) throw new Error(res.message)
    return res.data.appointment
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}
