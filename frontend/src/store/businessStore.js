import { create } from 'zustand'

/** Lightweight mirror for layouts/sidebars; React Query stays authoritative for server data */
export const useBusinessStore = create((set) => ({
  myBusiness: null,
  isLoading: false,

  setMyBusiness: (business) =>
    set({
      myBusiness: business,
      isLoading: false,
    }),

  setBusinessLoading: (isLoading) => set({ isLoading }),

  clearBusiness: () =>
    set({
      myBusiness: null,
      isLoading: false,
    }),
}))
