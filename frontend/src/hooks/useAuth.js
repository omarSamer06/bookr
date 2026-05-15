import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '@/store/authStore'

/** Narrow subscription surface so forms don’t re-render on unrelated store fields */
export default function useAuth() {
  return useAuthStore(
    useShallow((state) => ({
      user: state.user,
      token: state.token,
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
      setAuth: state.setAuth,
      updateUser: state.updateUser,
      logout: state.logout,
      initAuth: state.initAuth,
    }))
  )
}
