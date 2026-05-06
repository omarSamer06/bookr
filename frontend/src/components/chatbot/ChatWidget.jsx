import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatbotStore } from '@/store/chatbotStore'
import ChatWindow from '@/components/chatbot/ChatWindow'

export default function ChatWidget() {
  const { isOpen, hasUnread, openChat, closeChat, businessId, businessName } = useChatbotStore()
  const location = useLocation()

  // Ensures there is always a ready-to-use guest session for platform pages.
  useEffect(() => {
    const ensureGuest = async () => {
      try {
        if (!useChatbotStore.getState().sessionId && !useChatbotStore.getState().isLoading) {
          await openChat(null, { openWindow: false })
        }
      } catch {
        // If startup fails, the user can still retry by opening the widget.
      }
    }
    ensureGuest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When leaving a business detail page, fall back to the general assistant context.
  useEffect(() => {
    const onBusinessPage = location.pathname.startsWith('/businesses/')
    if (onBusinessPage) return
    if (!businessId) return
    openChat(null, { openWindow: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const toggle = async () => {
    if (isOpen) {
      closeChat()
      return
    }
    await openChat(businessId ?? null, { openWindow: true })
  }

  return (
    <>
      <ChatWindow businessName={businessName} />

      <button
        type="button"
        onClick={toggle}
        className={cn(
          'fixed bottom-6 right-4 z-50 flex size-14 items-center justify-center rounded-full text-white shadow-lg',
          'bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600',
          'transition-transform hover:scale-[1.03]',
          'animate-pulse animation-duration-[3.5s]'
        )}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        <MessageCircle className="size-6" aria-hidden />
        {hasUnread ? (
          <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-red-500 ring-2 ring-white" aria-hidden />
        ) : null}
      </button>
    </>
  )
}

