import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart2,
  Bell,
  Building2,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Star,
  UserCircle,
  UserRound,
  X,
} from 'lucide-react'
import UserAvatar from '@/components/profile/UserAvatar'
import { Button } from '@/components/ui/button'
import NotificationBell from '@/components/shared/NotificationBell'
import useAuth from '@/hooks/useAuth'
import { getDashboardPageTitle, getSidebarNav } from '@/lib/dashboardNav'
import { cn } from '@/lib/utils'

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

function sidebarLinkClass({ isActive }) {
  return cn(
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
    isActive
      ? 'bg-indigo-50 text-indigo-700 shadow-sm'
      : 'text-bookr-muted hover:bg-indigo-50/60 hover:text-bookr-text'
  )
}

const sidebarIconMap = {
  LayoutDashboard,
  Search,
  CalendarDays,
  Star,
  Bell,
  UserCircle,
  Building2,
  CalendarCheck,
  BarChart2,
}

function SidebarNavIcon({ name }) {
  const Icon = sidebarIconMap[name]
  if (!Icon) return null
  return <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} aria-hidden />
}

function SidebarNav({ onNavigate }) {
  const { user } = useAuth()
  const loc = useLocation()
  const nav = getSidebarNav(user?.role)
  const dashActive = loc.pathname === '/dashboard'

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Sidebar">
      {nav.map((item) => {
        if (item.label === 'Home') {
          return (
            <Link
              key={`${item.to}-${item.label}`}
              to="/dashboard"
              onClick={onNavigate}
              className={sidebarLinkClass({ isActive: dashActive })}
            >
              <SidebarNavIcon name={item.icon} />
              {item.label}
            </Link>
          )
        }

        if (item.label === 'Profile') {
          return (
            <NavLink
              key={`${item.to}-${item.label}`}
              to="/dashboard/profile"
              onClick={onNavigate}
              className={sidebarLinkClass}
            >
              <SidebarNavIcon name={item.icon} />
              {item.label}
            </NavLink>
          )
        }

        return (
          <NavLink key={`${item.to}-${item.label}`} to={item.to} onClick={onNavigate} className={sidebarLinkClass}>
            <SidebarNavIcon name={item.icon} />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}

/** Authenticated shell: fixed sidebar, top bar, warm main canvas */
export default function DashboardShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  useDismissOnOutsideAndEscape(userMenuOpen, setUserMenuOpen, userMenuRef)

  const title = getDashboardPageTitle(location.pathname)
  const onLogout = () => {
    setUserMenuOpen(false)
    setDrawerOpen(false)
    logout()
    navigate('/login')
  }

  const [pathnameSeen, setPathnameSeen] = useState(() => location.pathname)
  if (location.pathname !== pathnameSeen) {
    setPathnameSeen(location.pathname)
    if (drawerOpen) setDrawerOpen(false)
  }

  const closeDrawer = () => setDrawerOpen(false)

  const sidebarHeader = (
    <div className="flex h-16 shrink-0 items-center border-b border-gray-100 px-4">
      <Link
        to="/dashboard"
        onClick={closeDrawer}
        className="font-heading text-lg font-bold tracking-tight bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent"
      >
        Bookr
      </Link>
    </div>
  )

  const sidebarColumn = (
    <div className="flex h-full min-h-0 flex-col border-r border-gray-200 bg-white">
      {sidebarHeader}
      <SidebarNav onNavigate={closeDrawer} />
    </div>
  )

  return (
    <div className="flex min-h-screen bg-bookr-warm">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebarColumn}</aside>

      {drawerOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-200 lg:hidden',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 px-2">
          <span className="px-2 text-sm font-semibold text-bookr-text">Menu</span>
          <Button type="button" variant="ghost" size="icon" aria-label="Close sidebar" onClick={() => setDrawerOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{sidebarColumn}</div>
      </div>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white/95 px-4 shadow-sm backdrop-blur supports-backdrop-filter:bg-white/80 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <h1 className="truncate font-heading text-lg font-bold tracking-tight text-bookr-text">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="relative" ref={userMenuRef}>
              <Button
                type="button"
                variant="ghost"
                className="gap-2 rounded-full px-2"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <UserAvatar avatar={user?.avatar} name={user?.name ?? user?.email} className="size-9 text-xs" />
                <span className="hidden max-w-[140px] truncate text-sm text-bookr-muted sm:inline">{user?.name ?? user?.email}</span>
                <ChevronDown className="size-4 text-bookr-muted" aria-hidden />
              </Button>
              {userMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white p-1 shadow-md"
                >
                  <Link
                    role="menuitem"
                    to="/dashboard/profile"
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-indigo-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <UserRound className="size-4" aria-hidden />
                    Profile
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    onClick={onLogout}
                  >
                    <LogOut className="size-4" aria-hidden />
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="page-transition min-h-[calc(100vh-4rem)] flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
