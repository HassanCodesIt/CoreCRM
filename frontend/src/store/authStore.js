import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      setAuth: (user, token, refreshToken) => set({ user, token, refreshToken }),
      logout: () => set({ user: null, token: null, refreshToken: null }),
      updateUser: (user) => set((state) => ({ user: { ...state.user, ...user } })),
    }),
    {
      name: 'auth-storage',
    }
  )
)
