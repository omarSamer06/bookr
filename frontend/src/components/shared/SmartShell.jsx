import DashboardShell from '@/components/shared/DashboardShell'
import PublicShell from '@/components/shared/PublicShell'
import useAuth from '@/hooks/useAuth'

/** Chooses public vs authenticated chrome without duplicating page routes */
export default function SmartShell() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bookr-warm px-4">
        <div className="h-14 w-56 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
        <div className="h-4 w-40 animate-pulse rounded-lg bg-indigo-100/80" />
        <div className="h-4 w-32 animate-pulse rounded-lg bg-gray-200/80" />
      </div>
    )
  }

  return isAuthenticated ? <DashboardShell /> : <PublicShell />
}

