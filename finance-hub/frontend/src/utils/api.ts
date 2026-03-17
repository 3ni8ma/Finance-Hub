import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
})

// Attach auth token
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('finance-hub-auth')
  if (raw) {
    try {
      const { state } = JSON.parse(raw)
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`
      }
    } catch {
      // ignore
    }
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        localStorage.removeItem('finance-hub-auth')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
