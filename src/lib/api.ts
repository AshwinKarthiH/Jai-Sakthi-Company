import axios from "axios"
import { toast } from "sonner"

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
})

// Attach JWT Bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401: try token refresh; on failure redirect to login
let isRefreshing = false
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = []

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)))
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config

    if (err.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((e) => Promise.reject(e))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refresh = localStorage.getItem("refresh_token")
      if (refresh) {
        try {
          const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"
          const { data } = await axios.post(`${baseUrl}/auth/refresh/`, { refresh })
          localStorage.setItem("access_token", data.access)
          processQueue(null, data.access)
          originalRequest.headers.Authorization = `Bearer ${data.access}`
          isRefreshing = false
          return api(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError, null)
          isRefreshing = false
          localStorage.clear()
          window.location.href = "/"
        }
      } else {
        isRefreshing = false
        localStorage.clear()
        window.location.href = "/"
      }
    }

    // Handle common HTTP errors
    const status = err.response?.status
    const errorMsg =
      err.response?.data?.error ||
      err.response?.data?.detail ||
      err.response?.data?.message ||
      "An error occurred."

    if (status === 403) {
      if (window.location.pathname !== "/") {
        toast.error("You do not have permission to do this.")
      }
    } else if (status === 500) {
      toast.error("Server error. Please try again.")
    }

    return Promise.reject(err)
  }
)
