import { create } from 'zustand'

export const useNotificationStore = create((set, get) => ({
  unreadCount: 0,

  setUnreadCount: (count) => set({ unreadCount: Math.max(0, Number(count) || 0) }),

  incrementUnread: () => set({ unreadCount: get().unreadCount + 1 }),

  clearUnread: () => set({ unreadCount: 0 }),
}))
