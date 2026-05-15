import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/profileUtils'

/** Compact avatar for nav and menus */
export default function UserAvatar({ avatar, name, className }) {
  const initials = getInitials(name)
  if (avatar) {
    return (
      <img
        src={avatar}
        alt=""
        className={cn('shrink-0 rounded-full object-cover ring-2 ring-white', className)}
      />
    )
  }
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 font-semibold text-white ring-2 ring-white',
        className
      )}
      aria-hidden
    >
      {initials}
    </span>
  )
}
