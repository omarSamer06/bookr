import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Loader2, Star } from 'lucide-react'
import AvatarUploader from '@/components/profile/AvatarUploader'
import PasswordStrengthBar from '@/components/profile/PasswordStrengthBar'
import GoogleMark from '@/components/shared/GoogleMark'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import useAuth from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { updateAvatar, updatePassword, updateProfile } from '@/services/profile.service.js'

function formatMemberSince(createdAt) {
  if (!createdAt) return ''
  const d = new Date(createdAt)
  return `Member since ${d.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`
}

function roleLabel(role) {
  if (role === 'owner') return 'Business Owner'
  if (role === 'admin') return 'Admin'
  return 'Client'
}

function PersonalInfoForm({ user, updateUser }) {
  const [name, setName] = useState(user.name ?? '')
  const [phone, setPhone] = useState(user.phone ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  const onSaveProfile = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Name is required')
      return
    }
    setSavingProfile(true)
    try {
      const updated = await updateProfile({ name: trimmed, phone: phone.trim() })
      updateUser(updated)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <form onSubmit={onSaveProfile} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="profile-name">Name</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          type="email"
          value={user.email ?? ''}
          readOnly
          disabled
          className="rounded-xl bg-gray-50 text-bookr-muted"
        />
        <p className="text-xs text-bookr-muted">Email cannot be changed after registration</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-phone">Phone</Label>
        <Input
          id="profile-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Optional"
          className="rounded-xl"
        />
      </div>
      <Button
        type="submit"
        disabled={savingProfile}
        className="rounded-xl bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 text-white"
      >
        {savingProfile ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            Saving…
          </>
        ) : (
          'Save Changes'
        )}
      </Button>
    </form>
  )
}

/** Profile settings: personal info, password, and client reviews tab */
export default function ProfilePage() {
  const { user } = useAuth()
  const updateUser = useAuthStore((s) => s.updateUser)

  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const isClient = user?.role === 'client'
  const isGoogleOnly = Boolean(user?.googleId && !user?.hasPassword)

  const onUploadAvatar = async (formData) => {
    setUploadingAvatar(true)
    try {
      const updated = await updateAvatar(formData)
      updateUser(updated)
      toast.success('Photo updated')
    } catch (err) {
      toast.error(err.message)
      throw err
    } finally {
      setUploadingAvatar(false)
    }
  }

  const passwordValid =
    newPassword.length >= 8 &&
    confirmPassword === newPassword &&
    currentPassword.length > 0

  const onUpdatePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSavingPassword(true)
    try {
      await updatePassword({ currentPassword, newPassword })
      toast.success('Password updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSavingPassword(false)
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-bookr-text sm:text-3xl">
          Profile
        </h1>
        <p className="mt-1 text-sm text-bookr-muted">Manage your account settings and preferences.</p>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList
          variant="line"
          className="h-auto w-full flex-wrap justify-start gap-0 border-b border-gray-200 bg-transparent p-0"
        >
          <TabsTrigger value="personal" className="rounded-none px-4 py-3">
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="password" className="rounded-none px-4 py-3">
            Change Password
          </TabsTrigger>
          {isClient ? (
            <TabsTrigger value="reviews" className="rounded-none px-4 py-3">
              My Reviews
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="personal" className="mt-6 space-y-6">
          <Card className="border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Profile photo</CardTitle>
              <CardDescription>Upload a photo so others can recognize you.</CardDescription>
            </CardHeader>
            <CardContent>
              <AvatarUploader
                currentAvatar={user.avatar}
                userName={user.name}
                onUpload={onUploadAvatar}
                isUploading={uploadingAvatar}
              />
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Personal information</CardTitle>
              <CardDescription>Update your name and contact details.</CardDescription>
            </CardHeader>
            <CardContent>
              <PersonalInfoForm key={user._id} user={user} updateUser={updateUser} />
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-bookr-muted">{formatMemberSince(user.createdAt)}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-bookr-muted">Account type:</span>
                <Badge variant="secondary" className="rounded-full bg-indigo-50 text-indigo-700">
                  {roleLabel(user.role)}
                </Badge>
              </div>
              {user.googleId ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                  <GoogleMark className="size-4" />
                  <span className="font-medium text-bookr-text">Connected with Google</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password" className="mt-6">
          <Card className="border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Change password</CardTitle>
              <CardDescription>Choose a strong password you don&apos;t use elsewhere.</CardDescription>
            </CardHeader>
            <CardContent>
              {isGoogleOnly ? (
                <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Password cannot be changed for Google accounts.
                </p>
              ) : (
                <form onSubmit={onUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        className="rounded-xl pr-10"
                        required
                      />
                      <button
                        type="button"
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-bookr-muted hover:text-bookr-text"
                        onClick={() => setShowCurrent((v) => !v)}
                        aria-label={showCurrent ? 'Hide password' : 'Show password'}
                      >
                        {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={8}
                        className="rounded-xl pr-10"
                        required
                      />
                      <button
                        type="button"
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-bookr-muted hover:text-bookr-text"
                        onClick={() => setShowNew((v) => !v)}
                        aria-label={showNew ? 'Hide password' : 'Show password'}
                      >
                        {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    <PasswordStrengthBar password={newPassword} />
                    {newPassword.length > 0 && newPassword.length < 8 ? (
                      <p className="text-xs text-red-600">At least 8 characters required</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        className="rounded-xl pr-10"
                        required
                      />
                      <button
                        type="button"
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-bookr-muted hover:text-bookr-text"
                        onClick={() => setShowConfirm((v) => !v)}
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      >
                        {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== newPassword ? (
                      <p className="text-xs text-red-600">Passwords do not match</p>
                    ) : null}
                  </div>
                  <Button
                    type="submit"
                    disabled={savingPassword || !passwordValid}
                    className="rounded-xl bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 text-white"
                  >
                    {savingPassword ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                        Updating…
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isClient ? (
          <TabsContent value="reviews" className="mt-6">
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <Star className="size-12 text-indigo-200" aria-hidden />
                <div>
                  <p className="font-heading text-lg font-bold text-bookr-text">My Reviews</p>
                  <p className="mt-1 text-sm text-bookr-muted">
                    View and manage reviews you&apos;ve left after completed visits.
                  </p>
                </div>
                <Button asChild className="rounded-xl" variant="outline">
                  <Link to="/dashboard/reviews">View My Reviews</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}
