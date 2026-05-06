import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { businessQueryKeys, getMyBusiness } from '@/services/business.service.js'
import { useBusinessStore } from '@/store/businessStore'

export default function OwnerBusinessGate() {
  const location = useLocation()
  const setMyBusiness = useBusinessStore((s) => s.setMyBusiness)
  const clearBusiness = useBusinessStore((s) => s.clearBusiness)
  const setBusinessLoading = useBusinessStore((s) => s.setBusinessLoading)

  const onSetupRoute = location.pathname.endsWith('/setup')

  const { data: business, isLoading } = useQuery({
    queryKey: businessQueryKeys.mine,
    queryFn: getMyBusiness,
    staleTime: 60 * 1000,
    retry: false,
  })

  useEffect(() => {
    setBusinessLoading(isLoading)
  }, [isLoading, setBusinessLoading])

  useEffect(() => {
    if (isLoading) return
    if (business) setMyBusiness(business)
    else clearBusiness()
  }, [business, isLoading, setMyBusiness, clearBusiness])

  if (isLoading) {
    return (
      <div className="space-y-6 py-4">
        <div className="h-10 w-56 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-gray-100" />
      </div>
    )
  }

  const hasBusiness = business != null

  if (onSetupRoute && hasBusiness) {
    return <Navigate to="/dashboard/business" replace />
  }

  if (!onSetupRoute && !hasBusiness) {
    return <Navigate to="/dashboard/business/setup" replace />
  }

  return <Outlet />
}
