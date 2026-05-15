import { useEffect, useMemo } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import AuthShell from '@/components/shared/AuthShell'
import NotificationBootstrap from '@/components/shared/NotificationBootstrap'
import OwnerBusinessGate from '@/components/shared/OwnerBusinessGate'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import PublicShell from '@/components/shared/PublicShell'
import SmartShell from '@/components/shared/SmartShell'
import ChatWidget from '@/components/chatbot/ChatWidget'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import BusinessDashboardPage from '@/pages/owner/BusinessDashboardPage'
import BusinessSetupPage from '@/pages/owner/BusinessSetupPage'
import InsightsDashboardPage from '@/pages/owner/InsightsDashboardPage'
import BookingPage from '@/pages/client/BookingPage'
import ClientAppointmentsPage from '@/pages/client/ClientAppointmentsPage'
import PaymentSuccessPage from '@/pages/client/PaymentSuccessPage'
import OwnerAppointmentsPage from '@/pages/owner/OwnerAppointmentsPage'
import OwnerReviewsPage from '@/pages/owner/OwnerReviewsPage'
import NotificationsPage from '@/pages/NotificationsPage'
import BusinessDetailPage from '@/pages/public/BusinessDetailPage'
import BusinessListPage from '@/pages/public/BusinessListPage'
import { AUTH_TOKEN_KEY } from '@/lib/auth-constants'
import { useAuthStore } from '@/store/authStore'

function AuthPageFade({ children }) {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-transition min-h-screen">
      {children}
    </div>
  )
}

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
      // OAuth redirect lands on public routes; push into the authenticated area once the session is initialized.
      if (urlToken && useAuthStore.getState().isAuthenticated) {
        window.location.replace('/dashboard')
      }
    }
    bootstrap()
  }, [initAuth])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <NotificationBootstrap />
        <Routes>
          <Route element={<PublicShell />}>
            <Route path="/" element={<LandingPage />} />
          </Route>

          <Route element={<SmartShell />}>
            <Route path="/businesses" element={<BusinessListPage />} />
            <Route path="/businesses/:id" element={<BusinessDetailPage />} />
          </Route>

          <Route
            path="/login"
            element={
              <AuthPageFade>
                <LoginPage />
              </AuthPageFade>
            }
          />
          <Route
            path="/register"
            element={
              <AuthPageFade>
                <RegisterPage />
              </AuthPageFade>
            }
          />

          <Route element={<AuthShell />}>
            <Route
              path="/book/:businessId"
              element={
                <ProtectedRoute roles={['client']}>
                  <BookingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/appointments"
              element={
                <ProtectedRoute roles={['client']}>
                  <ClientAppointmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/success"
              element={
                <ProtectedRoute roles={['client']}>
                  <PaymentSuccessPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/business"
              element={
                <ProtectedRoute roles={['owner']}>
                  <OwnerBusinessGate />
                </ProtectedRoute>
              }
            >
              <Route index element={<BusinessDashboardPage />} />
              <Route path="appointments" element={<OwnerAppointmentsPage />} />
              <Route path="reviews" element={<OwnerReviewsPage />} />
              <Route path="setup" element={<BusinessSetupPage />} />
            </Route>
            <Route
              path="/dashboard/insights"
              element={
                <ProtectedRoute roles={['owner']}>
                  <InsightsDashboardPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ChatWidget />
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            '!rounded-xl !border !border-gray-200 !bg-white !text-bookr-text !shadow-md dark:!bg-white dark:!text-bookr-text',
        }}
      />
    </QueryClientProvider>
  )
}
