import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'

export default function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16">
        <div className="h-12 w-full max-w-md animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
        <div className="h-4 w-48 animate-pulse rounded-lg bg-indigo-100/80" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}
