import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Building2, Loader2, User } from 'lucide-react'
import GoogleMark from '@/components/shared/GoogleMark'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import useAuth from '@/hooks/useAuth'
import * as authService from '@/services/auth.service.js'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth, isLoading: bootLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const googleHref = authService.getGoogleAuthUrl()

  const fillDemo = ({ demoEmail, demoPassword }) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
    toast.success('Credentials filled — click Login to continue')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const { user, token } = await authService.login({ email, password })
      setAuth(user, token)
      toast.success('Welcome back')
      const from = location.state?.from
      const target =
        typeof from?.pathname === 'string'
          ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
          : '/dashboard'
      navigate(target, { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-bookr-warm via-bookr-lavender/40 to-bookr-warm p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-72 w-md -translate-x-1/2 rounded-full bg-indigo-400/15 blur-3xl" />
      </div>
      <Card className="relative w-full max-w-md border-gray-100 shadow-md">
        <CardHeader className="space-y-4 text-center">
          <Link
            to="/"
            className="font-heading text-2xl font-bold tracking-tight bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent"
          >
            Bookr
          </Link>
          <div>
            <CardTitle className="text-2xl">Log in</CardTitle>
            <CardDescription className="mt-2">Use your email or continue with Google.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={bootLoading || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <div className="space-y-1">
              <p className="font-heading text-sm font-bold text-bookr-text">🎯 Try Demo Accounts</p>
              <p className="text-xs text-bookr-muted">Click to auto-fill credentials</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-600 via-violet-600 to-purple-600 text-white shadow-sm">
                    <Building2 className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-heading text-sm font-bold text-bookr-text">Business Owner</p>
                    <p className="mt-1 text-xs text-bookr-muted">Manage business, view insights, handle appointments</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1 rounded-xl border border-indigo-100/60 bg-indigo-50/40 px-3 py-2 text-xs">
                  <p className="truncate">
                    <span className="font-semibold text-bookr-text">Email:</span> owner@bookrdemo.com
                  </p>
                  <p>
                    <span className="font-semibold text-bookr-text">Password:</span> Demo@1234
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 w-full bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 text-white hover:opacity-95"
                  onClick={() => fillDemo({ demoEmail: 'owner@bookrdemo.com', demoPassword: 'Demo@1234' })}
                >
                  Use This Account
                </Button>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 via-indigo-600 to-fuchsia-600 text-white shadow-sm">
                    <User className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-heading text-sm font-bold text-bookr-text">Client</p>
                    <p className="mt-1 text-xs text-bookr-muted">Browse businesses, book appointments, make payments</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1 rounded-xl border border-indigo-100/60 bg-indigo-50/40 px-3 py-2 text-xs">
                  <p className="truncate">
                    <span className="font-semibold text-bookr-text">Email:</span> client@bookrdemo.com
                  </p>
                  <p>
                    <span className="font-semibold text-bookr-text">Password:</span> Demo@1234
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 w-full bg-linear-to-r from-violet-600 via-indigo-600 to-fuchsia-600 text-white hover:opacity-95"
                  onClick={() => fillDemo({ demoEmail: 'client@bookrdemo.com', demoPassword: 'Demo@1234' })}
                >
                  Use This Account
                </Button>
              </div>
            </div>

            <p className="mt-3 text-xs text-bookr-muted">
              Demo accounts are for testing purposes only. Data may be reset periodically.
            </p>
          </div>

          <div className="relative text-center text-xs text-bookr-muted after:absolute after:inset-y-1/2 after:left-0 after:right-0 after:z-0 after:h-px after:bg-gray-200">
            <span className="relative z-10 bg-white px-3 font-medium">or</span>
          </div>

          <a
            href={googleHref}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'w-full justify-center gap-3 border-gray-200 bg-white no-underline hover:bg-gray-50'
            )}
          >
            <GoogleMark />
            Continue with Google
          </a>
        </CardContent>
        <CardFooter className="flex flex-col gap-1 text-center text-sm text-bookr-muted">
          <span>
            Need an account?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 underline-offset-4 hover:underline">
              Register
            </Link>
          </span>
        </CardFooter>
      </Card>
    </div>
  )
}
