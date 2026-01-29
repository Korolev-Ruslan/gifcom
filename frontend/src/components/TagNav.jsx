import React, { useState, useEffect } from 'react'
import { gifApi } from '../api/api'
import '../styles/TagNav.css'

export default function TagNav({ selectedTag, onTagSelect }) {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      setLoading(true)
      const res = await gifApi.getApproved({ limit: 100 })
      const gifs = res.data?.gifs || []
      
      const tagSet = new Set()
      gifs.forEach(gif => {
        if (gif.tags && Array.isArray(gif.tags)) {
          gif.tags.forEach(tag => tagSet.add(tag))
        }
      })
      
      setTags(Array.from(tagSet).sort())
    } catch (err) {
      console.error('Error fetching tags:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="tag-nav">
      <button 
        className={`tag-nav-btn ${selectedTag === '' ? 'active' : ''}`}
        onClick={() => onTagSelect('')}
      >
        Все
      </button>
      {tags.map(tag => (
        <button
          key={tag}
          className={`tag-nav-btn ${selectedTag === tag ? 'active' : ''}`}
          onClick={() => onTagSelect(tag)}
        >
          #{tag}
        </button>
      ))}
    </div>
  )
}