import api from './api.js'

const pickMessage = (err) =>
  err.response?.data?.message ?? err.message ?? 'Something went wrong'

export async function startSession(businessId) {
  try {
    const payload = {}
    if (businessId) payload.businessId = businessId
    const { data } = await api.post('/chatbot/session', payload)
    if (!data.success) throw new Error(data.message)
    return data.data
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function sendMessage(sessionId, message) {
  try {
    const { data } = await api.post('/chatbot/message', { sessionId, message })
    if (!data.success) throw new Error(data.message)
    return data.data
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function getSession(sessionId) {
  try {
    const { data } = await api.get(`/chatbot/session/${sessionId}`)
    if (!data.success) throw new Error(data.message)
    return data.data.session
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

