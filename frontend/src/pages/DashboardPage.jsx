import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import useAuth from '@/hooks/useAuth'

const roleLabels = {
  client: 'Client',
  owner: 'Business owner',
  admin: 'Admin',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    toast.success('Signed out')
    navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>You’re signed in. Booking tools will land here next.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="text-lg font-medium">{user?.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Role</p>
            <p className="text-lg font-medium">{roleLabels[user?.role] ?? user?.role}</p>
          </div>
          <Button type="button" variant="outline" className="gap-2" onClick={handleLogout}>
            <LogOut className="size-4" aria-hidden />
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
