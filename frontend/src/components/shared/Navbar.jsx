import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Menu, UserRound, X } from 'lucide-react'
import UserAvatar from '@/components/profile/UserAvatar'
import { Button } from '@/components/ui/button'
import NotificationBell from '@/components/shared/NotificationBell'
import useAuth from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

/** Keeps keyboard users inside the menu until Escape closes it (native dialog would be heavier here) */
function useDismissOnOutsideAndEscape(open, setOpen, containerRef) {
  useEffect(() => {
    if (!open) return

    const onDoc = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen, containerRef])
}

function navLinkClass({ isActive }) {
  return cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
  )
}

/** Primary chrome: role-aware IA plus account affordances without duplicating markup per page */
export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  useDismissOnOutsideAndEscape(userMenuOpen, setUserMenuOpen, userMenuRef)

  const role = user?.role
  const centerLinks =
    role === 'owner'
      ? [
          { to: '/dashboard/business', label: 'My Business' },
          { to: '/dashboard/business/appointments', label: 'Appointments' },
        ]
      : [
          { to: '/businesses', label: 'Browse Businesses' },
          { to: '/dashboard/appointments', label: 'My Appointments' },
        ]

  const onLogout = () => {
    setUserMenuOpen(false)
    setMobileOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="font-heading text-lg font-semibold tracking-tight text-foreground">
          Bookr
        </Link>

        <nav className="ml-4 hidden flex-1 items-center gap-1 md:flex" aria-label="Main">
          {centerLinks.map((l) => (
            <NavLink key={l.to} to={l.to} className={navLinkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />

          <div className="relative hidden md:block" ref={userMenuRef}>
            <Button
              type="button"
              variant="ghost"
              className="gap-2 px-2"
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              onClick={() => setUserMenuOpen((v) => !v)}
            >
              <UserAvatar avatar={user?.avatar} name={user?.name ?? user?.email} className="size-8 text-xs" />
              <span className="max-w-[140px] truncate text-sm text-muted-foreground">{user?.name ?? user?.email}</span>
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
            </Button>

            {userMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg"
              >
                <Link
                  role="menuitem"
                  to="/dashboard/profile"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <UserRound className="size-4" aria-hidden />
                  Profile
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                  onClick={onLogout}
                >
                  <LogOut className="size-4" aria-hidden />
                  Logout
                </button>
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile main">
            {centerLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={navLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
            <NavLink to="/dashboard/profile" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Profile
            </NavLink>
            <button
              type="button"
              className={cn(
                'rounded-md px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-muted/60'
              )}
              onClick={onLogout}
            >
              Logout
            </button>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
