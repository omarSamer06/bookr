import api from './api.js'

const pickMessage = (err) =>
  err.response?.data?.message ?? err.message ?? 'Something went wrong'

export async function getRecommendations(businessId, serviceId, date) {
  try {
    const { data } = await api.get('/recommendations', {
      params: { businessId, serviceId, date },
    })
    if (!data.success) throw new Error(data.message)
    return data.data
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

