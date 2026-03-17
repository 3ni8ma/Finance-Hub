import { create } from 'zustand'
import type { Holding, PriceAlert } from '../types'

interface PortfolioStore {
  holdings: Holding[]
  alerts: PriceAlert[]
  notifications: { id: string; message: string; ticker: string }[]
  setHoldings: (holdings: Holding[]) => void
  setAlerts: (alerts: PriceAlert[]) => void
  addNotification: (n: { id: string; message: string; ticker: string }) => void
  dismissNotification: (id: string) => void
}

export const usePortfolioStore = create<PortfolioStore>((set) => ({
  holdings: [],
  alerts: [],
  notifications: [],
  setHoldings: (holdings) => set({ holdings }),
  setAlerts: (alerts) => set({ alerts }),
  addNotification: (n) =>
    set((state) => ({ notifications: [n, ...state.notifications.slice(0, 9)] })),
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}))
