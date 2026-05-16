/** Sidebar entries stay declarative so role switches don’t fork layout markup */
export function getSidebarNav(role) {
  if (role === 'owner') {
    return [
      { to: '/dashboard', label: 'Home', icon: 'LayoutDashboard' },
      { to: '/dashboard/business', label: 'My Business', icon: 'Building2' },
      { to: '/dashboard/business/appointments', label: 'Appointments', icon: 'CalendarCheck' },
      { to: '/dashboard/business/reviews', label: 'Reviews', icon: 'Star' },
      { to: '/dashboard/insights', label: 'Insights', icon: 'BarChart2' },
      { to: '/notifications', label: 'Notifications', icon: 'Bell' },
      { to: '/dashboard/profile', label: 'Profile', icon: 'UserCircle' },
    ]
  }
  return [
    { to: '/dashboard', label: 'Home', icon: 'LayoutDashboard' },
    { to: '/businesses', label: 'Browse Businesses', icon: 'Search' },
    { to: '/dashboard/appointments', label: 'My Appointments', icon: 'CalendarDays' },
    { to: '/dashboard/reviews', label: 'My Reviews', icon: 'Star' },
    { to: '/notifications', label: 'Notifications', icon: 'Bell' },
    { to: '/dashboard/profile', label: 'Profile', icon: 'UserCircle' },
  ]
}

/** Maps authenticated routes to header titles without coupling pages to context */
export function getDashboardPageTitle(pathname) {
  if (pathname === '/dashboard') return 'Home'
  if (pathname === '/dashboard/profile') return 'Profile'
  if (pathname === '/dashboard/appointments') return 'My appointments'
  if (pathname === '/dashboard/reviews') return 'My reviews'
  if (pathname === '/notifications') return 'Notifications'
  if (pathname === '/payment/success') return 'Payment'
  if (pathname.startsWith('/book/')) return 'Book appointment'
  if (pathname === '/dashboard/business/setup') return 'Business setup'
  if (pathname === '/dashboard/business/appointments') return 'Appointments'
  if (pathname === '/dashboard/business/reviews') return 'Reviews'
  if (pathname === '/dashboard/business') return 'My business'
  if (pathname === '/dashboard/insights') return 'Business insights'
  return 'Bookr'
}
