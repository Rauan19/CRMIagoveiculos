import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        })
      },

      login: async (email: string, password: string) => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
        const response = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Erro ao fazer login' }))
          throw new Error(error.error || 'Erro ao fazer login')
        }

        const data = await response.json()
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        })
      },

      checkAuth: async () => {
        const state = get()
        
        // Se tiver accessToken e user, está autenticado
        // O interceptor da API vai tratar a renovação automática se o token expirar
        if (state.accessToken && state.user) {
          set({ isAuthenticated: true })
        } else {
          set({ isAuthenticated: false })
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
        // Limpar localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage')
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
