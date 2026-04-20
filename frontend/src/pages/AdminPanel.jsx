import { useState, useEffect } from 'react'
import { adminApi } from '../api/api'
import { API_ORIGIN } from '../config'
import Masonry from 'react-masonry-css'
import '../styles/AdminPanel.css'

function AdminPanel() {
  const [pendingGifs, setPendingGifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedGif, setSelectedGif] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    tags: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isBulkApproving, setIsBulkApproving] = useState(false)

  useEffect(() => {
    fetchPendingGifs()
  }, [])

  const fetchPendingGifs = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await adminApi.getPending(token)
      setPendingGifs(response.data)
    } catch (err) {
      setError('Ошибка при загрузке GIF')
    } finally {
      setLoading(false)
    }
  }

  const openGifModal = (gif) => {
    setSelectedGif(gif)
    const tagsValue = gif.tags || []
    const tagsString = Array.isArray(tagsValue) 
      ? tagsValue.join(', ') 
      : (typeof tagsValue === 'string' ? tagsValue : '')
    
    setEditData({
      title: gif.title,
      description: gif.description || '',
      tags: tagsString
    })
  }

  const closeGifModal = () => {
    setSelectedGif(null)
    setEditData({
      title: '',
      description: '',
      tags: ''
    })
  }

  const handleEditChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true)
      const token = localStorage.getItem('token')
      const tagsArray = editData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== '')

      await adminApi.updatePending(selectedGif.id, {
        title: editData.title,
        description: editData.description,
        tags: tagsArray
      }, token)

      const updatedGif = {
        ...selectedGif,
        title: editData.title,
        description: editData.description,
        tags: tagsArray
      }
      setSelectedGif(updatedGif)
      setPendingGifs(gifs => 
        gifs.map(g => g.id === selectedGif.id ? updatedGif : g)
      )
      alert('Изменения сохранены')
    } catch (err) {
      setError('Ошибка при сохранении изменений')
    } finally {
      setIsSaving(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem('token')
      await adminApi.approve(id, token)
      setPendingGifs(gifs => gifs.filter(g => g.id !== id))
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      closeGifModal()
    } catch (err) {
      setError('Ошибка при одобрении')
    }
  }

  const handleReject = async (id) => {
    if (window.confirm('Вы уверены, что хотите отклонить этот GIF?')) {
      try {
        const token = localStorage.getItem('token')
        await adminApi.reject(id, token)
        setPendingGifs(gifs => gifs.filter(g => g.id !== id))
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        closeGifModal()
      } catch (err) {
        setError('Ошибка при отклонении')
      }
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const selectAll = () => {
    setSelectedIds(new Set(pendingGifs.map(g => g.id)))
  }

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return
    const confirmMsg = `Одобрить ${selectedIds.size} GIF?`
    if (!window.confirm(confirmMsg)) return

    setIsBulkApproving(true)
    try {
      const token = localStorage.getItem('token')
      const ids = Array.from(selectedIds)
      for (const gifId of ids) {
        await adminApi.approve(gifId, token)
      }
      setPendingGifs(gifs => gifs.filter(g => !selectedIds.has(g.id)))
      clearSelection()
    } catch (err) {
      setError('Ошибка при массовом одобрении')
    } finally {
      setIsBulkApproving(false)
    }
  }

  if (loading) return <div className="main-content"><p>Загружается...</p></div>

  const breakpointColumnsObj = {
    default: 6,
    1920: 5,
    1280: 4,
    720: 4,
    480: 2
  };

  return (
    <div className="main-content">
      <h1>Админ-панель</h1>
      {error && <div className="error">{error}</div>}

      <h2>{pendingGifs.length} GIF, на проверке</h2>
      {pendingGifs.length > 0 && (
        <div className="bulk-actions">
          <div className="bulk-left">
            <button className="bulk-btn" onClick={selectAll}>
              Выбрать все
            </button>
            <button className="bulk-btn" onClick={clearSelection}>
              Снять выделение
            </button>
          </div>
          <div className="bulk-right">
            <span className="bulk-count">Выбрано: {selectedIds.size}</span>
            <button
              className="bulk-approve-btn"
              onClick={handleBulkApprove}
              disabled={selectedIds.size === 0 || isBulkApproving}
            >
              {isBulkApproving ? 'Одобряем...' : 'Одобрить выбранные'}
            </button>
          </div>
        </div>
      )}

      {pendingGifs.length === 0 ? (
        <p>Нет GIF для проверки</p>
      ) : (
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="gifs-grid"
          columnClassName="gif-column"
        >
          {pendingGifs.map((gif) => (
            <div 
              key={gif.id} 
              className={`gif-card admin-gif-card ${selectedIds.has(gif.id) ? 'selected' : ''}`}
              onClick={() => openGifModal(gif)}
            >
              <label className="gif-select" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(gif.id)}
                  onChange={() => toggleSelect(gif.id)}
                />
                <span className="gif-select-box" />
              </label>
              <img src={`${API_ORIGIN}/${gif.filename}`} alt={gif.title} />
              <div className="gif-card-info">
                <div className="gif-card-header">
                  <div className="gif-card-titles">
                    <h3>{gif.title}</h3>
                    <p className="author">{gif.username}</p>
                  </div>
                  <div className="gif-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="card-action-btn card-edit-btn"
                      onClick={() => openGifModal(gif)}
                      title="Изменить"
                    >
                      ✏️
                    </button>
                    <button 
                      className="card-action-btn card-approve-btn"
                      onClick={() => handleApprove(gif.id)}
                      title="Одобрить"
                    >
                      ✓
                    </button>
                    <button 
                      className="card-action-btn card-reject-btn"
                      onClick={() => handleReject(gif.id)}
                      title="Отклонить"
                    >
                      ✗
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Masonry>
      )}

      {selectedGif && (
        <div className="modal-overlay" onClick={closeGifModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeGifModal}>✕</button>

            <div className="modal-body">
              <div className="modal-gif">
                <img src={`${API_ORIGIN}/${selectedGif.filename}`} alt={selectedGif.title} />
              </div>

              <div className="modal-info">
                <div className="info-section">
                  <label>Название:</label>
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => handleEditChange('title', e.target.value)}
                    className="edit-input"
                  />
                </div>

                <div className="info-section">
                  <label>Описание:</label>
                  <textarea
                    value={editData.description}
                    onChange={(e) => handleEditChange('description', e.target.value)}
                    className="edit-textarea"
                    rows="4"
                  />
                </div>

                <div className="info-section">
                  <label>Теги (через запятую):</label>
                  <input
                    type="text"
                    value={editData.tags}
                    onChange={(e) => handleEditChange('tags', e.target.value)}
                    className="edit-input"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>

                <div className="info-section">
                  <label>Автор:</label>
                  <p>{selectedGif.username}</p>
                </div>

                <div className="modal-actions">
                  <button 
                    className="save-btn"
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Сохранение...' : '💾 Сохранить'}
                  </button>
                  <button 
                    className="approve-btn"
                    onClick={() => handleApprove(selectedGif.id)}
                  >
                    ✓ Одобрить
                  </button>
                  <button 
                    className="reject-btn"
                    onClick={() => handleReject(selectedGif.id)}
                  >
                    ✗ Отклонить
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminPanel