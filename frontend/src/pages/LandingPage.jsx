import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <CalendarDays className="size-12 text-primary" aria-hidden />
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Bookr</h1>
        <p className="max-w-md text-muted-foreground">
          Scheduling and appointments — sign in to manage your bookings.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link to="/businesses" className={cn(buttonVariants({ variant: 'secondary' }))}>
          Browse businesses
        </Link>
        <Link to="/login" className={cn(buttonVariants())}>
          Log in
        </Link>
        <Link to="/register" className={cn(buttonVariants({ variant: 'outline' }))}>
          Create account
        </Link>
      </div>
    </div>
  )
}
