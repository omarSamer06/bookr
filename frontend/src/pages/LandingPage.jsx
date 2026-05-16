import { Link } from 'react-router-dom'
import { CalendarCheck, Clock, Shield } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const features = [
  {
    title: 'Real-time availability',
    body: 'Browse live slots that match each business’s hours, breaks, and services.',
    icon: Clock,
  },
  {
    title: 'Payments when you need them',
    body: 'Stripe-backed checkout for paid visits — complimentary services skip the card entirely.',
    icon: Shield,
  },
  {
    title: 'Reminders in one place',
    body: 'Email and SMS notifications stay grouped so clients and owners stay aligned.',
    icon: CalendarCheck,
  },
]

const steps = [
  { n: '1', title: 'Pick a business', body: 'Filter by category and city, then open a polished profile.' },
  { n: '2', title: 'Choose service & time', body: 'Select a service, date, and slot that still has capacity.' },
  { n: '3', title: 'Confirm & go', body: 'Review details, add notes, and pay only when the visit requires it.' },
]

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-linear-to-br from-indigo-400/30 via-violet-400/25 to-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-24 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />

      <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Bookr</p>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-bookr-text sm:text-5xl lg:text-6xl">
            <span className="bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
              Book Smarter, Not Harder
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-bookr-muted">
            Scheduling, appointments, and payments in one calm experience — built for clients discovering new spots and
            owners who need fewer back-and-forth messages.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'min-w-[180px] justify-center bg-linear-to-r from-indigo-500 to-purple-600 px-8 text-white shadow-sm hover:scale-[1.02] hover:from-indigo-600 hover:to-purple-700'
              )}
            >
              Get started
            </Link>
            <Link
              to="/businesses"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'min-w-[180px] justify-center border-indigo-200 text-indigo-700 hover:bg-indigo-50'
              )}
            >
              Browse businesses
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-gray-100 bg-white/80 py-20 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold tracking-tight text-bookr-text">Why teams use Bookr</h2>
            <p className="mt-3 text-bookr-muted">Everything stays structured — from discovery to the day-of visit.</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-gray-100 bg-linear-to-br from-indigo-50/80 to-purple-50/60 p-6 shadow-sm transition-all duration-200 hover:border-indigo-100 hover:shadow-md"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-indigo-100">
                  <f.icon className="size-6 text-indigo-600" aria-hidden />
                </div>
                <h3 className="mt-5 font-heading text-lg font-bold text-bookr-text">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-bookr-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-bookr-text">How it works</h2>
          <p className="mt-3 text-bookr-muted">Three quick steps — no spreadsheets required.</p>
        </div>
        <ol className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <li
              key={s.n}
              className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:border-indigo-100 hover:shadow-md"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                {s.n}
              </span>
              <h3 className="mt-4 font-heading text-lg font-bold text-bookr-text">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-bookr-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 px-8 py-14 text-center shadow-lg sm:px-12">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-white">Ready to get started?</h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">
            Create a free account in minutes — clients book faster, owners keep schedules under control.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'border-0 bg-white text-indigo-700 shadow-md hover:scale-[1.02] hover:bg-gray-50'
              )}
            >
              Create your account
            </Link>
            <Link
              to="/login"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'border-white/40 bg-white/10 text-white hover:bg-white/20'
              )}
            >
              Log in
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
