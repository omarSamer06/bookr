import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
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
    <div className="mx-auto max-w-xl px-4 py-10">
      <Card className="border-border/80 shadow-lg">
        <CardHeader>
          <CardTitle>Set up your business</CardTitle>
          <CardDescription>
            Owners get one Bookr profile — add basics now; hours and services live on the next screen.
          </CardDescription>
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
