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
      try {
        const authStorage = localStorage.getItem('auth-storage')
        if (authStorage) {
          const parsed = JSON.parse(authStorage)
          const token = parsed.state?.accessToken
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          } else {
            console.warn('[API] Token não encontrado no estado')
          }
        } else {
          console.warn('[API] Auth storage não encontrado')
        }
      } catch (error) {
        console.error('[API] Erro ao parsear auth storage:', error)
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
    // 401 indica token expirado/inválido - fazer logout simples
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Limpar localStorage
        localStorage.removeItem('auth-storage')
        
        // Redirecionar para login se não estiver já lá
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

export default api
