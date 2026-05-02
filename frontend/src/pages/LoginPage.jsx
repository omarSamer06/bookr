import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Globe } from 'lucide-react'
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
  const { setAuth, isLoading: bootLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const googleHref = authService.getGoogleAuthUrl()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const { user, token } = await authService.login({ email, password })
      setAuth(user, token)
      toast.success('Welcome back')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/80 shadow-lg">
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Use your email or continue with Google.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Button type="submit" className="w-full" disabled={bootLoading || isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="relative text-center text-xs text-muted-foreground after:absolute after:inset-y-1/2 after:left-0 after:right-0 after:z-0 after:h-px after:bg-border">
            <span className="relative z-10 bg-card px-2">or</span>
          </div>

          <a
            href={googleHref}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'w-full justify-center gap-2 no-underline'
            )}
          >
            <Globe className="size-4" aria-hidden />
            Continue with Google
          </a>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Need an account?{' '}
          <Link to="/register" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">
            Register
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
