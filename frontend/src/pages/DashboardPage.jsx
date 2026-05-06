import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Building2, CalendarDays, LogOut, Sparkles } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import useAuth from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const roleLabels = {
  client: 'Client',
  owner: 'Business owner',
  admin: 'Admin',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    toast.success('Signed out')
    navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-8 text-white shadow-lg sm:p-10">
        <div className="flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Sparkles className="size-7" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-indigo-100">Welcome back</p>
            <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">{user?.name ?? 'Bookr member'}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-indigo-100">
              You’re signed in as a <span className="font-semibold text-white">{roleLabels[user?.role] ?? user?.role}</span>
              . Jump into bookings or manage your business from the sidebar.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-gray-100 shadow-sm transition-all duration-200 hover:border-indigo-100 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-5 text-indigo-600" aria-hidden />
              Discover
            </CardTitle>
            <CardDescription>Browse live profiles and book in a few guided steps.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              to="/businesses"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full justify-center border-indigo-200 text-indigo-700 hover:bg-indigo-50')}
            >
              Browse businesses
            </Link>
            {user?.role === 'client' ? (
              <Link
                to="/dashboard/appointments"
                className={cn(buttonVariants({ size: 'lg' }), 'w-full justify-center')}
              >
                My appointments
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm transition-all duration-200 hover:border-indigo-100 hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-5 text-violet-600" aria-hidden />
              Manage
            </CardTitle>
            <CardDescription>Owners tune services, hours, and imagery in one cockpit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {user?.role === 'owner' ? (
              <Link
                to="/dashboard/business"
                className={cn(buttonVariants({ size: 'lg' }), 'w-full justify-center')}
              >
                My business dashboard
              </Link>
            ) : (
              <p className="text-sm text-bookr-muted">Switch to an owner account to unlock business tools.</p>
            )}
            <Link
              to="/notifications"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full justify-center border-gray-200')}
            >
              Notifications
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
          <CardDescription>Sign out on shared devices when you’re finished.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" className="gap-2 border-gray-200" onClick={handleLogout}>
            <LogOut className="size-4" aria-hidden />
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
