const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')
const API_ORIGIN = API_URL.replace(/\/api$/, '')
export { API_URL, API_ORIGIN }