import axios from 'axios'
import { API_URL } from '../config'

const API = API_URL

export async function computeFileHash(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const authApi = {
  register: (username, email, password) =>
    axios.post(`${API}/auth/register`, { username, email, password }),
  login: (email, password) =>
    axios.post(`${API}/auth/login`, { email, password }),
}

export const gifApi = {
  upload: (formData, token) =>
    axios.post(`${API}/gifs/upload`, formData, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  uploadMultiple: (formData, token) =>
    axios.post(`${API}/gifs/upload`, formData, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  getGifCount: (token) =>
    axios.get(`${API}/gifs/count`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  convertVideo: (formData, token) =>
    axios.post(`${API}/gifs/convert`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    }),
  getApproved: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.page) qs.append('page', params.page)
    if (params.limit) qs.append('limit', params.limit)
    if (params.exclude_ids) qs.append('exclude_ids', params.exclude_ids)
    if (params.tag) qs.append('tag', params.tag)
    if (params.q) qs.append('q', params.q)
    const qstr = qs.toString() ? `?${qs.toString()}` : ''
    return axios.get(`${API}/gifs/approved${qstr}`)
  },
  getById: (id) =>
    axios.get(`${API}/gifs/${id}`),
  download: (id) =>
    axios.get(`${API}/gifs/${id}/download`, { responseType: 'blob' }),
  search: (query, tag) => {
    const params = new URLSearchParams()
    if (query) params.append('q', query)
    if (tag) params.append('tag', tag)
    return axios.get(`${API}/gifs/search?${params}`)
  },
  getUserGifs: (username) =>
    axios.get(`${API}/gifs/channel/${username}`),
  suggest: (q) =>
    axios.get(`${API}/gifs/suggest?q=${encodeURIComponent(q)}`),
}

export const checkApi = {
  checkHashes: (hashes, token) =>
    axios.post(`${API}/check/check-hash`, { hashes }, {
      headers: { Authorization: `Bearer ${token}` }
    }),
}

export const adminApi = {
  getPending: (token) =>
    axios.get(`${API}/admin/pending`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  approve: (id, token) =>
    axios.post(`${API}/admin/approve/${id}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  reject: (id, token) =>
    axios.post(`${API}/admin/reject/${id}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  delete: (id, token) =>
    axios.delete(`${API}/admin/delete/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  updatePending: (id, data, token) =>
    axios.put(`${API}/admin/pending/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` }
    }),
}

export const commentApi = {
  add: (gifId, text, token) =>
    axios.post(`${API}/comments/${gifId}`, { text }, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  get: (gifId) =>
    axios.get(`${API}/comments/${gifId}`),
}

export const ratingApi = {
  add: (gifId, reaction, token) =>
    axios.post(`${API}/ratings/${gifId}`, { reaction }, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  get: (gifId) =>
    axios.get(`${API}/ratings/${gifId}`),
  getUserReaction: (gifId, token) =>
    axios.get(`${API}/ratings/${gifId}/user-reaction`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
}

export const userApi = {
  getProfile: (username) =>
    axios.get(`${API}/users/${username}`),
  subscribe: (userId, token) =>
    axios.post(`${API}/users/${userId}/subscribe`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  unsubscribe: (userId, token) =>
    axios.delete(`${API}/users/${userId}/unsubscribe`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  isSubscribed: (userId, token) =>
    axios.get(`${API}/users/${userId}/is-subscribed`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  getSubscriptions: (userId) =>
    axios.get(`${API}/users/${userId}/subscriptions`),
  getFollowers: (userId) =>
    axios.get(`${API}/users/${userId}/followers`),
}

export const notificationApi = {
  getNotifications: (token, page = 1) =>
    axios.get(`${API}/notifications?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  getUnreadCount: (token) =>
    axios.get(`${API}/notifications/unread/count`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  markAsRead: (id, token) =>
    axios.put(`${API}/notifications/${id}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  markAllAsRead: (token) =>
    axios.put(`${API}/notifications/read-all`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  deleteNotification: (id, token) =>
    axios.delete(`${API}/notifications/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
}

export const favoriteApi = {
  add: (gifId, token) =>
    axios.post(`${API}/favorites/${gifId}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  remove: (gifId, token) =>
    axios.delete(`${API}/favorites/${gifId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  getAll: (token) =>
    axios.get(`${API}/favorites`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  check: (gifId, token) =>
    axios.get(`${API}/favorites/${gifId}/check`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
}
