import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar o token de autenticação
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage)
          const token = parsed.state?.accessToken
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
        } catch (error) {
          console.error('Erro ao parsear auth storage:', error)
        }
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      if (typeof window !== 'undefined') {
        const authStorage = localStorage.getItem('auth-storage')
        if (authStorage) {
          try {
            const parsed = JSON.parse(authStorage)
            const refreshToken = parsed.state?.refreshToken

            if (refreshToken) {
              try {
                const response = await axios.post(
                  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
                  { refreshToken }
                )

                const newAccessToken = response.data.accessToken
                parsed.state.accessToken = newAccessToken
                parsed.state.isAuthenticated = true
                localStorage.setItem('auth-storage', JSON.stringify(parsed))

                // Retentar a requisição original com o novo token
                error.config.headers.Authorization = `Bearer ${newAccessToken}`
                return api.request(error.config)
              } catch (refreshError) {
                // Refresh token inválido, fazer logout
                localStorage.removeItem('auth-storage')
                if (window.location.pathname !== '/login') {
                  window.location.href = '/login'
                }
              }
            }
          } catch (parseError) {
            console.error('Erro ao parsear auth storage:', parseError)
          }
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
