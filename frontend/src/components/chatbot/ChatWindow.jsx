import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Bot, Minus, Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sendMessage as sendChatMessage } from '@/services/chatbot.service.js'
import { useChatbotStore } from '@/store/chatbotStore'
import ChatMessage from '@/components/chatbot/ChatMessage'
import TypingIndicator from '@/components/chatbot/TypingIndicator'

function titleForBusiness(businessName) {
  return businessName ? businessName : 'Bookr Assistant'
}

function clamp500(value) {
  const s = String(value ?? '')
  return s.length > 500 ? s.slice(0, 500) : s
}

export default function ChatWindow({ businessName }) {
  const {
    isOpen,
    closeChat,
    sessionId,
    messages,
    addMessage,
    isLoading,
    setLoading,
  } = useChatbotStore()

  const [minimized, setMinimized] = useState(false)
  const [draft, setDraft] = useState('')
  const listRef = useRef(null)

  const safeMessages = useMemo(() => messages ?? [], [messages])

  useEffect(() => {
    if (!isOpen) return
    if (minimized) return
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [isOpen, minimized, safeMessages.length, isLoading])

  if (!isOpen) return null

  const remaining = 500 - draft.length
  const nearLimit = remaining <= 40

  const onSubmit = async () => {
    const text = clamp500(draft).trim()
    if (!text) return
    if (!sessionId) {
      toast.error('Chat session not ready yet.')
      return
    }

    setDraft('')
    addMessage({ role: 'user', content: text, timestamp: new Date().toISOString() })

    setLoading(true)
    try {
      const data = await sendChatMessage(sessionId, text)
      const serverMessages = data?.session?.messages
      if (Array.isArray(serverMessages)) {
        // Prefer server transcript so timing/order stays authoritative.
        useChatbotStore.setState({ messages: serverMessages })
      } else if (data?.reply) {
        addMessage({ role: 'assistant', content: data.reply, timestamp: new Date().toISOString() })
      }
    } catch (err) {
      toast.error(err.message)
      addMessage({
        role: 'assistant',
        content: 'Sorry — I had trouble replying just now. Please try again.',
        timestamp: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key !== 'Enter') return
    if (e.shiftKey) return
    e.preventDefault()
    onSubmit()
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] sm:right-6">
      <div
        className={cn(
          'overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl ring-1 ring-black/5',
          'animate-in slide-in-from-bottom-4 fade-in-0 duration-200',
          minimized ? 'h-16' : 'h-[500px]'
        )}
      >
        <header className="flex h-16 items-center justify-between gap-3 bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 px-4 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Bot className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{titleForBusiness(businessName)}</p>
              <p className="text-xs text-white/80">AI-powered booking assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-xl p-2 hover:bg-white/10"
              aria-label={minimized ? 'Restore chat' : 'Minimize chat'}
              onClick={() => setMinimized((v) => !v)}
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              className="rounded-xl p-2 hover:bg-white/10"
              aria-label="Close chat"
              onClick={closeChat}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </header>

        {minimized ? null : (
          <>
            <div ref={listRef} className="h-[calc(500px-4rem-5rem)] space-y-4 overflow-y-auto bg-bookr-warm px-4 py-4">
              {!safeMessages.length ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 px-5 py-10 text-center text-sm text-bookr-muted">
                  Ask about services, pricing, working hours, or how to book.
                </div>
              ) : (
                safeMessages.map((m, idx) => <ChatMessage key={`${m.timestamp ?? idx}-${idx}`} message={m} />)
              )}

              {isLoading ? (
                <div className="flex justify-start">
                  <span className="mr-2 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/60">
                    <Bot className="size-4" aria-hidden />
                  </span>
                  <TypingIndicator />
                </div>
              ) : null}
            </div>

            <div className="border-t border-gray-100 bg-white p-3">
              <div className="relative">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(clamp500(e.target.value))}
                  onKeyDown={onKeyDown}
                  placeholder="Type your message…"
                  disabled={isLoading}
                  rows={2}
                  className={cn(
                    'w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-12 text-sm text-bookr-text outline-none',
                    'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300/80 disabled:opacity-60'
                  )}
                />
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={isLoading || !draft.trim() || !sessionId}
                  className={cn(
                    'absolute right-2 top-2 flex size-9 items-center justify-center rounded-xl text-white shadow-sm transition-all',
                    'bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600',
                    'disabled:opacity-50'
                  )}
                  aria-label="Send message"
                >
                  <Send className="size-4" aria-hidden />
                </button>
              </div>
              {nearLimit ? (
                <p className={cn('mt-2 text-right text-[11px]', remaining < 0 ? 'text-red-600' : 'text-bookr-muted')}>
                  {draft.length}/500
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

