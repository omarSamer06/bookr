import { useEffect, useMemo } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import { AUTH_TOKEN_KEY } from '@/lib/auth-constants'
import { useAuthStore } from '@/store/authStore'

export default function App() {
  const queryClient = useMemo(() => new QueryClient(), [])
  const initAuth = useAuthStore((s) => s.initAuth)

  useEffect(() => {
    const bootstrap = async () => {
      const params = new URLSearchParams(window.location.search)
      const urlToken = params.get('token')
      if (urlToken) {
        localStorage.setItem(AUTH_TOKEN_KEY, urlToken)
        window.history.replaceState({}, document.title, window.location.pathname)
      }
      await initAuth()
    }
    bootstrap()
  }, [initAuth])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="dark min-h-screen bg-background antialiased">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{ className: 'dark:bg-card dark:text-card-foreground' }} />
    </QueryClientProvider>
  )
}
