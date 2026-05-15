import { cn } from '@/lib/utils'

function getStrength(password) {
  if (!password) return { level: 'weak', label: 'Weak', score: 0 }

  const len = password.length
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)
  const types = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length

  if (len >= 8 && hasLower && hasUpper && hasNumber && hasSpecial) {
    return { level: 'strong', label: 'Strong', score: 3 }
  }
  if (len >= 8 && types >= 2) {
    return { level: 'medium', label: 'Medium', score: 2 }
  }
  return { level: 'weak', label: 'Weak', score: 1 }
}

const barColors = {
  weak: 'bg-red-500',
  medium: 'bg-yellow-500',
  strong: 'bg-green-500',
}

const labelColors = {
  weak: 'text-red-600',
  medium: 'text-yellow-700',
  strong: 'text-green-700',
}

/** Visual password strength indicator driven by length and character variety */
export default function PasswordStrengthBar({ password }) {
  const { level, label, score } = getStrength(password)

  if (!password) return null

  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3].map((segment) => (
          <div
            key={segment}
            className={cn(
              'h-1.5 flex-1 rounded-full bg-gray-200 transition-colors',
              segment <= score && barColors[level]
            )}
          />
        ))}
      </div>
      <p className={cn('text-xs font-medium', labelColors[level])}>{label}</p>
    </div>
  )
}
