import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gifApi, checkApi, computeFileHash } from '../api/api';
import '../styles/Upload.css';

function Upload() {
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [expandedFileId, setExpandedFileId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [globalProgress, setGlobalProgress] = useState('');
  const [uploadStats, setUploadStats] = useState(null);

  const updateFile = (id, patch) => {
    setFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, ...patch } : f))
    );
  };

  const revokeAllPreviews = () => {
    files.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
  };

  const handleFileChange = useCallback(
    (e) => {
      const selected = Array.from(e.target.files || []);
      if (!selected.length) return;

      processFiles(selected);
    },
    [files]
  );

  // Обработчик drag-and-drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      const dropped = Array.from(e.dataTransfer.files || []);
      if (!dropped.length) return;

      processFiles(dropped);
    },
    [files]
  );

  // Общая функция обработки файлов
  const processFiles = (selectedFiles) => {
    const allowed = selectedFiles.filter(file => {
      const isGif =
        file.type === 'image/gif' ||
        file.name.toLowerCase().endsWith('.gif');

      const isVideo =
        ['video/mp4', 'video/mov', 'video/avi', 'video/webm'].includes(file.type) ||
        ['.mp4', '.mov', '.avi', '.webm'].some(ext =>
          file.name.toLowerCase().endsWith(ext)
        );

      return isGif || isVideo;
    });

    if (!allowed.length) {
      setError('Недопустимый формат. Разрешены: GIF, MP4, MOV, AVI, WebM');
      return;
    }

    const existingKeys = new Set(
      files.map(f => `${f.file.name}-${f.file.size}`)
    );

    const unique = allowed.filter(
      f => !existingKeys.has(`${f.name}-${f.size}`)
    );

    if (!unique.length) {
      setError('Все выбранные файлы уже добавлены');
      return;
    }

    const slots = 10 - files.length;
    const toAdd = unique.slice(0, slots);

    const prepared = toAdd.map(file => {
      const isVideo =
        file.type.startsWith('video/') ||
        ['.mp4', '.mov', '.avi', '.webm'].some(ext =>
          file.name.toLowerCase().endsWith(ext)
        );

      return {
        id: crypto.randomUUID(),
        file,
        isVideo,
        preview: isVideo ? null : URL.createObjectURL(file),
        hash: null,
        status: 'pending',
        reason: null,
        progress: '',
        title: file.name.replace(/\.[^/.]+$/, ''),
        description: '',
        tags: ''
      };
    });

    setFiles(prev => [...prev, ...prepared]);
    setError('');
  };

  const removeFile = (id) => {
    const target = files.find(f => f.id === id);
    if (target?.preview) URL.revokeObjectURL(target.preview);
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const toggleExpand = (id) => {
    setExpandedFileId(prev => prev === id ? null : id);
  };

  const computeHashes = async () => {
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (f.status !== 'pending') continue;

    setFiles(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], status: 'hashing', progress: 'Вычисление хеша...' };
      return copy;
    });

    const hash = await computeFileHash(f.file);

    setFiles(prev => {
      const copy = [...prev];
      copy[i] = { ...copy[i], hash, status: 'checking', progress: 'Проверка...' };
      return copy;
    });
  }
};

const checkDuplicates = async () => {
  const token = localStorage.getItem('token');

  const hashes = [];
  const fileIndices = [];
  
  files.forEach((f, i) => {
    if (f.status === 'checking' && f.hash) {
      hashes.push(f.hash);
      fileIndices.push(i);
    }
  });

  if (!hashes.length) return;

  setGlobalProgress('Проверка дубликатов...');
  
  const res = await checkApi.checkHashes(hashes, token);
  if (!res.data?.results) return;

  const duplicates = new Set(
    res.data.results
      .filter(r => r.exists)
      .map(r => r.hash)
  );

  setFiles(prev => {
    const copy = [...prev];
    copy.forEach((f, i) => {
      if (f.status === 'checking') {
        if (duplicates.has(f.hash)) {
          copy[i] = { ...f, status: 'skipped', reason: 'Такая GIF уже есть на сайте' };
        } else {
          copy[i] = { ...f, status: 'ready', reason: 'Готово к загрузке' };
        }
      }
    });
    return copy;
  });
};

  const uploadFiles = async (working) => {
  const token = localStorage.getItem('token');

  const gifsToUpload = working.filter(f => f.status === 'ready' && !f.isVideo);
  const videosToUpload = working.filter(f => f.status === 'ready' && f.isVideo);

  for (const f of gifsToUpload) {
    updateFile(f.id, { status: 'uploading', progress: 'Загрузка...' });

    const formData = new FormData();
    formData.append('gif', f.file);
    formData.append('title', f.title || f.file.name.replace(/\.[^/.]+$/, ''));
    formData.append('description', f.description);
    formData.append('tags', f.tags);
    formData.append('fileHash', f.hash);

    try {
      await gifApi.upload(formData, token);
      updateFile(f.id, { status: 'done', progress: 'Готово', reason: null });
    } catch (err) {
      if (err.response?.data?.error?.includes('уже') || err.response?.data?.duplicate) {
        updateFile(f.id, { status: 'error', progress: 'Ошибка', reason: 'Такая GIF уже есть на сайте' });
      } else {
        updateFile(f.id, { status: 'error', progress: 'Ошибка' });
        throw err;
      }
    }
  }

  for (const f of videosToUpload) {
    updateFile(f.id, { status: 'converting', progress: 'Конвертация...' });

    const formData = new FormData();
    formData.append('video', f.file);
    formData.append('title', f.title || f.file.name.replace(/\.[^/.]+$/, ''));
    formData.append('description', f.description);
    formData.append('tags', f.tags);
    formData.append('fps', 10);
    formData.append('width', 480);

    try {
      const response = await gifApi.convertVideo(formData, token);
      
      if (response.data?.duplicate) {
        updateFile(f.id, { 
          status: 'error', 
          progress: 'Ошибка', 
          reason: 'Такая GIF уже есть на сайте'
        });
      } else {
        updateFile(f.id, { status: 'done', progress: 'Готово', reason: null });
      }
    } catch (err) {
      if (err.response?.data?.error?.includes('уже') || err.response?.data?.duplicate) {
        updateFile(f.id, { 
          status: 'error', 
          progress: 'Ошибка', 
          reason: 'Такая GIF уже есть на сайте'
        });
      } else {
        updateFile(f.id, { status: 'error', progress: 'Ошибка' });
        throw err;
      }
    }
  }
};

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');

  if (!files.length) {
    setError('Выберите файлы для загрузки');
    return;
  }

  setLoading(true);
  setChecking(true);
  setGlobalProgress('Вычисление хешей...');

  try {
    const filesWithHashes = await Promise.all(
      files.map(async (f) => {
        if (f.status !== 'pending') return f;
        updateFile(f.id, { status: 'hashing', progress: 'Вычисление хеша...' });
        const hash = await computeFileHash(f.file);
        return { ...f, hash, status: 'checking', progress: 'Проверка...' };
      })
    );

    setFiles(filesWithHashes);
    setGlobalProgress('Проверка дубликатов...');

    const hashes = filesWithHashes.filter(f => f.status === 'checking' && f.hash).map(f => f.hash);

    if (hashes.length > 0) {
      const token = localStorage.getItem('token');
      const res = await checkApi.checkHashes(hashes, token);

      if (res.data?.results) {
        const duplicates = new Set(res.data.results.filter(r => r.exists).map(r => r.hash));
        
        filesWithHashes.forEach((f, i) => {
          if (f.status === 'checking') {
            const isDuplicate = duplicates.has(f.hash);
            if (f.isVideo) {
              filesWithHashes[i] = {
                ...f,
                status: 'ready',
                progress: 'Готово к конвертации',
                reason: null
              };
            } else if (isDuplicate) {
              filesWithHashes[i] = {
                ...f,
                status: 'error',
                progress: 'Ошибка',
                reason: 'Такая GIF уже есть на сайте'
              };
            } else {
              filesWithHashes[i] = {
                ...f,
                status: 'ready',
                reason: 'Готово к загрузке'
              };
            }
          }
        });
      }
    }

    setFiles([...filesWithHashes]);
    setChecking(false);
    setGlobalProgress('');

    const toUpload = filesWithHashes.filter(f => f.status === 'ready');
    
    if (toUpload.length === 0) {
      setError('Все GIF уже существуют на сайте');
      setLoading(false);
      return;
    }

    await uploadFiles(toUpload);

    setFiles(currentFiles => {
      const hasErrors = currentFiles.some(f => f.status === 'error');
      const hasSkipped = currentFiles.some(f => f.status === 'skipped');

      if (hasErrors || hasSkipped) {
        setError('Не все файлы прошли проверку');
      } else {
        setSuccess('Все файлы успешно загружены!');
      }
      return currentFiles;
    });

  } catch (err) {
    setError(err.response?.data?.message || err.response?.data?.error || 'Ошибка при загрузке');
  } finally {
    setLoading(false);
    setChecking(false);
    setGlobalProgress('');
  }
};

  const activeCount = files.filter(f => f.status !== 'skipped').length;
  const readyCount = files.filter(f => f.status === 'ready').length;

  return (
    <div className="container">
      <div className="upload-form-container">
        <form 
          onSubmit={handleSubmit} 
          className="upload-form"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <h2>Загрузить файлы</h2>
          <p className="upload-form-hint">
            Перетащите файлы сюда или нажмите для выбора
          </p>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          {(checking || globalProgress) && (
            <div className="upload-progress">
              {checking ? 'Проверка файлов...' : globalProgress}
            </div>
          )}

          <div className="upload-field">
            <label className="file-upload-label">
              <input
                type="file"
                className="file-upload-input"
                multiple
                accept=".gif,.mp4,.mov,.avi,.webm"
                onChange={handleFileChange}
                disabled={loading || files.length >= 10}
              />
              <div className="file-upload-content">
                <span className="upload-icon">📁</span>
                <span className="upload-text">
                  {files.length === 0 
                    ? 'Перетащите файлы сюда или нажмите для выбора' 
                    : `Выбрано ${files.length}/10`}
                </span>
                <span className="upload-hint">GIF, MP4, MOV, AVI, WebM</span>
              </div>
            </label>
          </div>

          {files.length > 0 && (
            <div className="files-preview">
              {files.map(f => (
                <div key={f.id} className={`file-preview-item ${f.status === 'error' ? 'file-error' : f.status} ${expandedFileId === f.id ? 'expanded' : ''}`}>
                  {f.isVideo ? (
                    <div className="video-thumbnail">
                      <span className="video-icon">🎬</span>
                    </div>
                  ) : (
                    <img src={f.preview} alt={f.file.name} className="file-preview-img" />
                  )}

                  <div className="file-preview-info">
                    <div className="file-name">{f.file.name}</div>
                    <div className={`file-progress ${f.status === 'error' ? 'file-error' : f.status}`}>{f.progress}</div>
                    {f.reason && <div className="file-reason">{f.reason}</div>}
                  </div>

                  <div className="file-actions">
                    <button
                      type="button"
                      className="file-edit-btn"
                      onClick={() => toggleExpand(f.id)}
                      disabled={loading || checking}
                      title="Редактировать"
                    >
                      {expandedFileId === f.id ? '✓' : '✏️'}
                    </button>
                    <button
                      type="button"
                      className="file-remove-btn"
                      onClick={() => removeFile(f.id)}
                      disabled={loading || checking}
                    >
                      ×
                    </button>
                  </div>

                  {expandedFileId === f.id && (
                    <div className="file-metadata">
                      <input
                        type="text"
                        placeholder="Название"
                        value={f.title}
                        onChange={e => updateFile(f.id, { title: e.target.value })}
                        className="file-input"
                      />
                      <textarea
                        placeholder="Описание"
                        value={f.description}
                        onChange={e => updateFile(f.id, { description: e.target.value })}
                        className="file-textarea"
                        rows={2}
                      />
                      <input
                        type="text"
                        placeholder="Теги, через запятую"
                        value={f.tags}
                        onChange={e => updateFile(f.id, { tags: e.target.value })}
                        className="file-input"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {files.some(f => f.status === 'done' || f.status === 'skipped' || f.status === 'error') && (
            <div className="upload-stats">
              <div className="upload-stat loaded">
                <span className="upload-stat-number">{files.filter(f => f.status === 'done').length}</span>
                <span className="upload-stat-label">Загружено</span>
              </div>
              <div className="upload-stat skipped">
                <span className="upload-stat-number">{files.filter(f => f.status === 'skipped').length}</span>
                <span className="upload-stat-label">Пропущено</span>
              </div>
              <div className="upload-stat errors">
                <span className="upload-stat-number">{files.filter(f => f.status === 'error').length}</span>
                <span className="upload-stat-label">Ошибки</span>
              </div>
            </div>
          )}

          {files.some(f => f.isVideo && f.status === 'pending') && (
            <div className="conversion-options">
              <p>Некоторые файлы будут конвертированы в формат GIF</p>
            </div>
          )}


          <button type="submit" disabled={loading || checking}>
  {checking ? 'Проверка...' : 'Загрузить'}
</button>
        </form>
      </div>
    </div>
  );
}

export default Upload;