import { useState, useEffect, useRef } from 'react'
import { gifApi } from '../api/api'
import '../styles/SearchAutocomplete.css'

export default function SearchAutocomplete() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [show, setShow] = useState(false)
  const [active, setActive] = useState(-1)
  const timerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const fetchSuggestions = (q) => {
    if (!q) { setSuggestions([]); return }
    gifApi.suggest(q).then(res => {
      setSuggestions(res.data.suggestions || [])
      setShow(true)
      setActive(-1)
    }).catch(err => {
      console.error('Suggest error', err)
    })
  }

  const onChange = (e) => {
    const v = e.target.value
    setQuery(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchSuggestions(v), 250)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setActive(a => Math.min(a + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setActive(a => Math.max(a - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = active >= 0 ? suggestions[active].value : query
      if (sel) window.location.href = `/?q=${encodeURIComponent(sel)}`
    }
  }

  const onSelect = (value) => {
    window.location.href = `/?q=${encodeURIComponent(value)}`
  }

  return (
    <div className="search-autocomplete">
      <input
        ref={inputRef}
        value={query}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={() => { if (suggestions.length) setShow(true) }}
        onBlur={() => setTimeout(() => setShow(false), 150)}
        className="search-autocomplete-input"
        placeholder="Поиск GIF..."
        type="text"
      />

      {show && suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((s, i) => (
            <li key={`${s.type}-${s.value}-${i}`} className={i === active ? 'active' : ''} onMouseDown={() => onSelect(s.value)}>
              <span className="s-type">{s.type === 'tag' ? '#' : '🎬'}</span>
              <span className="s-value">{s.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}