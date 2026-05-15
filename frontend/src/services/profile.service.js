import axios from 'axios'
import api from './api.js'
import { AUTH_TOKEN_KEY } from '@/lib/auth-constants'

const pickMessage = (err) =>
  err.response?.data?.message ?? err.message ?? 'Something went wrong'

/** Updates the authenticated user's name and phone */
export async function updateProfile(payload) {
  try {
    const { data } = await api.patch('/auth/profile', payload)
    if (!data.success) throw new Error(data.message)
    return data.data.user
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

/** Uploads a new profile avatar via multipart form data */
export async function updateAvatar(formData) {
  try {
    const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    const { data } = await axios.patch(`${base}/auth/avatar`, formData, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      withCredentials: true,
    })
    if (!data.success) throw new Error(data.message)
    return data.data.user
  } catch (err) {
    throw new Error(pickMessage(err), { cause: err })
  }
}

export { updatePassword } from './auth.service.js'
