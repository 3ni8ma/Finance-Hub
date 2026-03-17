import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'
import api from '../utils/api'

interface AuthStore {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  setTokens: (accessToken: string, user: User) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        set({
          user: data.user,
          accessToken: data.accessToken,
          isAuthenticated: true,
        })
      },

      register: async (email, password) => {
        const { data } = await api.post('/auth/register', { email, password })
        set({
          user: data.user,
          accessToken: data.accessToken,
          isAuthenticated: true,
        })
      },

      logout: () => {
        set({ user: null, accessToken: null, isAuthenticated: false })
      },

      setTokens: (accessToken, user) => {
        set({ accessToken, user, isAuthenticated: true })
      },
    }),
    {
      name: 'finance-hub-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
