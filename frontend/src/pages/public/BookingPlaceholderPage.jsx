import { Link, useParams } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** Stub route preserves navigation contracts until Phase 4 scheduling ships */
export default function BookingPlaceholderPage() {
  const { businessId } = useParams()

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-16">
      <Card className="w-full border-border/80">
        <CardHeader>
          <CardTitle>Booking opens soon</CardTitle>
          <CardDescription>
            Slot picking for business{' '}
            <span className="font-mono text-xs">{businessId ?? '—'}</span> will arrive in the next phase.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          For now, reach out via phone or website from the business profile.
        </CardContent>
        <CardFooter>
          <Link
            to={businessId ? `/businesses/${businessId}` : '/businesses'}
            className={cn(buttonVariants())}
          >
            Back to profile
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
