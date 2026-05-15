import { create } from 'zustand'
import * as authService from '@/services/auth.service.js'
import { AUTH_TOKEN_KEY } from '@/lib/auth-constants'
import { useBusinessStore } from '@/store/businessStore'
import { useNotificationStore } from '@/store/notificationStore'

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  // Starts true so a hard refresh on protected routes waits for initAuth instead of flashing /login
  isLoading: true,

  setAuth: (user, token) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    })
  },

  /** Merges profile/avatar updates into the live session without re-fetching */
  updateUser: (updatedUser) => {
    set((state) => ({
      user: updatedUser,
      token: state.token,
      isAuthenticated: true,
      isLoading: false,
    }))
  },

  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    useBusinessStore.getState().clearBusiness()
    useNotificationStore.getState().clearUnread()
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },

  /** Restores session after refresh using the persisted JWT + a server-side user lookup */
  initAuth: async () => {
    const stored = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!stored) {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      })
      return
    }

    set({ isLoading: true, token: stored })
    try {
      const user = await authService.getMe()
      set({
        user,
        token: stored,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },
}))
