import api from './api.js'

const pickMessage = (err) =>
  err.response?.data?.message ?? err.message ?? 'Something went wrong'

export const reviewQueryKeys = {
  business: (businessId, page) => ['reviews', 'business', businessId, page],
  mine: ['reviews', 'mine'],
  owner: (page) => ['reviews', 'owner', page],
}

export async function createReview(payload) {
  try {
    const { data } = await api.post('/reviews', payload)
    if (!data.success) throw new Error(data.message)
    return data.data.review
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function getBusinessReviews(businessId, { page = 1, limit = 10 } = {}) {
  try {
    const { data } = await api.get(`/reviews/business/${businessId}`, { params: { page, limit } })
    if (!data.success) throw new Error(data.message)
    return data.data
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function getMyReviews() {
  try {
    const { data } = await api.get('/reviews/my')
    if (!data.success) throw new Error(data.message)
    return data.data.reviews ?? []
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function getOwnerBusinessReviews({ page = 1, limit = 20 } = {}) {
  try {
    const { data } = await api.get('/reviews/owner', { params: { page, limit } })
    if (!data.success) throw new Error(data.message)
    return data.data
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function replyToReview(reviewId, comment) {
  try {
    const { data } = await api.patch(`/reviews/${reviewId}/reply`, { comment })
    if (!data.success) throw new Error(data.message)
    return data.data.review
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function deleteReview(reviewId) {
  try {
    const { data } = await api.delete(`/reviews/${reviewId}`)
    if (!data.success) throw new Error(data.message)
    return true
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}
