import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function navClass({ isActive }) {
  return cn(
    'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-indigo-50 text-indigo-700'
      : 'text-bookr-muted hover:bg-gray-50 hover:text-bookr-text'
  )
}

/** Marketing chrome: discovery + auth entry points on public surfaces */
export default function PublicNavbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="font-heading text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent"
        >
          Bookr
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Public">
          <NavLink to="/" end className={navClass}>
            Home
          </NavLink>
          <NavLink to="/businesses" className={navClass}>
            Browse
          </NavLink>
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50'
            )}
          >
            Log in
          </Link>
          <Link
            to="/register"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 text-white shadow-sm hover:scale-[1.02] hover:from-indigo-600 hover:to-purple-700'
            )}
          >
            Get started
          </Link>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {open ? (
        <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Public mobile">
            <NavLink to="/" end className={navClass} onClick={() => setOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/businesses" className={navClass} onClick={() => setOpen(false)}>
              Browse businesses
            </NavLink>
            <Link
              to="/login"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'mt-2 w-full justify-center rounded-xl')}
              onClick={() => setOpen(false)}
            >
              Log in
            </Link>
            <Link
              to="/register"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm'
              )}
              onClick={() => setOpen(false)}
            >
              Get started
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
