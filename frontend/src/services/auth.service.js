import api from './api.js'

const pickMessage = (err) =>
  err.response?.data?.message ?? err.message ?? 'Something went wrong'

/** Builds absolute Google OAuth URL against the same API base the SPA already trusts */
export function getGoogleAuthUrl() {
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
  return `${base}/auth/google`
}

export async function register(payload) {
  try {
    const { data } = await api.post('/auth/register', payload)
    if (!data.success) throw new Error(data.message)
    return data.data
  } catch (err) {
    throw new Error(pickMessage(err))
  }
}

export async function login(payload) {
  try {
    const { data } = await api.post('/auth/login', payload)
    if (!data.success) throw new Error(data.message)
    return data.data
  } catch (err) {
    throw new Error(pickMessage(err))
  }
}

export async function getMe() {
  try {
    const { data } = await api.get('/auth/me')
    if (!data.success) throw new Error(data.message)
    return data.data.user
  } catch (err) {
    throw new Error(pickMessage(err))
  }
}

export async function updatePassword(payload) {
  try {
    const { data } = await api.patch('/auth/update-password', payload)
    if (!data.success) throw new Error(data.message)
    return data
  } catch (err) {
    throw new Error(pickMessage(err))
  }
}
