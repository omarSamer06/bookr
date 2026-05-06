import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

function escapeHtml(input) {
  return String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function renderLiteMarkdown(content) {
  const escaped = escapeHtml(content)
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  const withBreaks = withBold.replace(/\n/g, '<br />')
  return withBreaks
}

function formatTime(ts) {
  const d = ts ? new Date(ts) : null
  if (!d || Number.isNaN(d.valueOf())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatMessage({ message }) {
  const isUser = message?.role === 'user'
  const time = formatTime(message?.timestamp)

  return (
    <div
      className={cn(
        'animate-in fade-in-0 duration-200',
        isUser ? 'flex justify-end' : 'flex justify-start'
      )}
    >
      {!isUser ? (
        <span className="mr-2 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/60">
          <Bot className="size-4" aria-hidden />
        </span>
      ) : null}

      <div className={cn('max-w-[78%]')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ring-1',
            isUser
              ? 'bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 text-white ring-indigo-200/30'
              : 'bg-white text-bookr-text ring-gray-100'
          )}
          dangerouslySetInnerHTML={{ __html: renderLiteMarkdown(message?.content) }}
        />
        {time ? (
          <p className={cn('mt-1 text-[11px] text-bookr-muted', isUser ? 'text-right' : 'text-left')}>
            {time}
          </p>
        ) : null}
      </div>
    </div>
  )
}

