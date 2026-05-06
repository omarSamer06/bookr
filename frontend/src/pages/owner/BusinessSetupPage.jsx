import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Sparkles } from 'lucide-react'
import BusinessInfoForm from '@/components/business/BusinessInfoForm'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { businessQueryKeys, createBusiness } from '@/services/business.service.js'

export default function BusinessSetupPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: createBusiness,
    onSuccess: () => {
      toast.success('Business created')
      qc.invalidateQueries({ queryKey: businessQueryKeys.mine })
      qc.invalidateQueries({ queryKey: ['businesses', 'list'] })
      navigate('/dashboard/business', { replace: true })
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-4">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-8 text-white shadow-lg sm:p-10">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
            <Sparkles className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-indigo-100">Let’s set up your business</p>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">Tell clients who you are</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-indigo-100">
              Owners get one Bookr profile — add basics now; hours and services live on the next screen.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-bookr-muted shadow-sm">
        <span className="flex size-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
          1
        </span>
        <span className="font-medium text-bookr-text">Basic info</span>
        <span className="text-bookr-muted">→</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-bookr-muted">Location & contact</span>
      </div>

      <Card className="border-gray-100 shadow-md">
        <CardHeader>
          <CardTitle>Business details</CardTitle>
          <CardDescription>These fields power your public profile and booking funnel.</CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessInfoForm
            initialValues={{}}
            submitLabel="Create business"
            isPending={mutation.isPending}
            onSubmit={(payload) => mutation.mutate(payload)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
