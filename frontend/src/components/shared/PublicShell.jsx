import { Outlet } from 'react-router-dom'
import PublicNavbar from '@/components/shared/PublicNavbar'

/** Wraps marketing + directory pages with shared top navigation */
export default function PublicShell() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-bookr-warm via-bookr-lavender/30 to-bookr-warm">
      <PublicNavbar />
      <main className="page-transition">
        <Outlet />
      </main>
    </div>
  )
}
