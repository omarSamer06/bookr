import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'
import DashboardShell from '@/components/shared/DashboardShell'

/** Centralizes auth gate; dashboard chrome lives in DashboardShell */
export default function AuthShell() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bookr-warm px-4">
        <div className="h-14 w-56 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
        <div className="h-4 w-40 animate-pulse rounded-lg bg-indigo-100/80" />
        <div className="h-4 w-32 animate-pulse rounded-lg bg-gray-200/80" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <DashboardShell />
}
