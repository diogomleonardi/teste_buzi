import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: number
  nome: string
  email: string
  oab?: string
  cargo?: string
  avatar_url?: string
  is_active: boolean
  is_admin: boolean
  created_at: string
}

interface AuthState {
  user: User | null
  token: string | null
  isDark: boolean
  sidebarCollapsed: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  toggleDark: () => void
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isDark: false,
      sidebarCollapsed: false,

      setAuth: (user, token) => {
        localStorage.setItem('jurisai_token', token)
        localStorage.setItem('jurisai_user', JSON.stringify(user))
        set({ user, token })
      },

      logout: () => {
        localStorage.removeItem('jurisai_token')
        localStorage.removeItem('jurisai_user')
        set({ user: null, token: null })
      },

      toggleDark: () => set((state) => {
        const newDark = !state.isDark
        if (newDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        return { isDark: newDark }
      }),

      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'jurisai_auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isDark: state.isDark,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)
