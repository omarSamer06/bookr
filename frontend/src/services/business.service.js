import axios from 'axios'
import api from './api.js'
import { AUTH_TOKEN_KEY } from '@/lib/auth-constants'

const pickMessage = (err) =>
  err.response?.data?.message ?? err.message ?? 'Something went wrong'

/** Dedicated multipart POST avoids json Content-Type fighting browser-built boundaries */
async function postMultipartImages(formData) {
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  const res = await axios.post(`${base}/businesses/me/images`, formData, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    withCredentials: true,
  })
  return res.data
}

export async function getBusinesses(filters = {}) {
  try {
    const params = {}
    if (filters.category) params.category = filters.category
    if (filters.city?.trim()) params.city = filters.city.trim()
    if (filters.search?.trim()) params.search = filters.search.trim()
    const { data } = await api.get('/businesses', { params })
    if (!data.success) throw new Error(data.message)
    return data.data.businesses
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function getBusinessById(id) {
  try {
    const { data } = await api.get(`/businesses/${id}`)
    if (!data.success) throw new Error(data.message)
    return data.data.business
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

/** Treats missing business as null so routing can branch without throwing into React Query error boundaries */
export async function getMyBusiness() {
  try {
    const { data } = await api.get('/businesses/me')
    if (!data.success) throw new Error(data.message)
    return data.data.business
  } catch (err) {
    if (err.response?.status === 404) return null
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function createBusiness(payload) {
  try {
    const { data } = await api.post('/businesses', payload)
    if (!data.success) throw new Error(data.message)
    return data.data.business
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function updateBusiness(payload) {
  try {
    const { data } = await api.patch('/businesses/me', payload)
    if (!data.success) throw new Error(data.message)
    return data.data.business
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function uploadImages(formData) {
  try {
    const data = await postMultipartImages(formData)
    if (!data.success) throw new Error(data.message)
    return data.data.business
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function deleteImage(url) {
  try {
    const { data } = await api.delete('/businesses/me/images', { data: { url } })
    if (!data.success) throw new Error(data.message)
    return data.data.business
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function addService(payload) {
  try {
    const { data } = await api.post('/businesses/me/services', payload)
    if (!data.success) throw new Error(data.message)
    return data.data.business
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function updateService(serviceId, payload) {
  try {
    const { data } = await api.patch(`/businesses/me/services/${serviceId}`, payload)
    if (!data.success) throw new Error(data.message)
    return data.data.business
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export async function deleteService(serviceId) {
  try {
    const { data } = await api.delete(`/businesses/me/services/${serviceId}`)
    if (!data.success) throw new Error(data.message)
    return data.data.business
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

/** Stable React Query roots without coupling UI trees to URL shapes */
export const businessQueryKeys = {
  all: ['businesses'],
  list: (filters) => ['businesses', 'list', filters],
  detail: (id) => ['businesses', 'detail', id],
  mine: ['businesses', 'mine'],
}
