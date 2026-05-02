import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import useAuth from '@/hooks/useAuth'

export default function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
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
