import { create } from 'zustand'
import * as chatbotService from '@/services/chatbot.service.js'

const STORAGE_GUEST = 'bookr_chat_session_guest'
const STORAGE_BUSINESS_PREFIX = 'bookr_chat_session_business_'

function storageKeyForBusiness(businessId) {
  return businessId ? `${STORAGE_BUSINESS_PREFIX}${businessId}` : STORAGE_GUEST
}

function readStoredSessionId(businessId) {
  try {
    return localStorage.getItem(storageKeyForBusiness(businessId)) || null
  } catch {
    return null
  }
}

function writeStoredSessionId(businessId, sessionId) {
  try {
    localStorage.setItem(storageKeyForBusiness(businessId), String(sessionId))
  } catch {
    // ignore storage failures (private mode, quota); state still works in-memory
  }
}

function clearStoredSessionId(businessId) {
  try {
    localStorage.removeItem(storageKeyForBusiness(businessId))
  } catch {
    // ignore
  }
}

export const useChatbotStore = create((set, get) => ({
  sessionId: null,
  messages: [],
  isOpen: false,
  isLoading: false,
  businessId: null,
  businessName: null,
  hasUnread: false,

  setSessionId: (id) => set({ sessionId: id }),
  setLoading: (isLoading) => set({ isLoading }),

  addMessage: (message) => {
    const msg = {
      role: message?.role,
      content: String(message?.content ?? ''),
      timestamp: message?.timestamp ?? new Date().toISOString(),
    }
    set((s) => ({
      messages: [...(s.messages ?? []), msg],
      hasUnread: s.isOpen ? false : msg.role === 'assistant' ? true : s.hasUnread,
    }))
  },

  closeChat: () => set({ isOpen: false }),

  clearSession: () => {
    const { businessId } = get()
    clearStoredSessionId(businessId)
    set({
      sessionId: null,
      messages: [],
      isLoading: false,
      hasUnread: false,
    })
  },

  /**
   * Opens/pivots the chat context while keeping sessions separate per business.
   * We persist only the session id so transcripts are fetched server-side.
   */
  openChat: async (businessId, opts = {}) => {
    const openWindow = opts.openWindow !== false

    set((s) => ({
      isOpen: openWindow ? true : s.isOpen,
      hasUnread: openWindow ? false : s.hasUnread,
      businessId: businessId ?? null,
      businessName: opts.businessName ?? (businessId ? s.businessName : null),
    }))

    const stored = readStoredSessionId(businessId)
    if (stored) {
      set({ sessionId: stored, isLoading: true })
      try {
        const session = await chatbotService.getSession(stored)
        set({
          messages: session?.messages ?? [],
          isLoading: false,
        })
        return
      } catch {
        clearStoredSessionId(businessId)
        set({ sessionId: null, messages: [], isLoading: false })
      }
    }

    set({ isLoading: true })
    const started = await chatbotService.startSession(businessId)
    writeStoredSessionId(businessId, started.sessionId)

    set({
      sessionId: started.sessionId,
      messages: [
        {
          role: 'assistant',
          content: started.welcomeMessage,
          timestamp: new Date().toISOString(),
        },
      ],
      isLoading: false,
    })
  },
}))

