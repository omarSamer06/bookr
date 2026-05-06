export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <span className="sr-only">Assistant is typing</span>
      <span className="inline-flex items-center gap-1">
        <span className="size-2 animate-bounce rounded-full bg-indigo-500 [animation-delay:-0.2s]" />
        <span className="size-2 animate-bounce rounded-full bg-indigo-500 [animation-delay:-0.1s]" />
        <span className="size-2 animate-bounce rounded-full bg-indigo-500" />
      </span>
    </div>
  )
}

