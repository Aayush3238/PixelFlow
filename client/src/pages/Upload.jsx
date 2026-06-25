import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { images } from '../api/client';
import { Link, Upload as UploadIcon } from 'lucide-react';

export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [existingFolders, setExistingFolders] = useState([]);
  const [existingTags, setExistingTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [options, setOptions] = useState({
    tags: '',
    folder: '',
    expiresAt: '',
    stripExif: true,
    watermarkText: '',
  });
  const inputRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    images.folders().then((data) => setExistingFolders(data.folders)).catch(() => {});
    images.tags().then((data) => setExistingTags(data.tags)).catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleFiles = (selected) => {
    const nextFiles = Array.from(selected || []).filter((file) => file.type.startsWith('image/'));
    if (!nextFiles.length) {
      setError('Please select at least one image file');
      return;
    }
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles(nextFiles);
    setError('');
    setPreviews(nextFiles.slice(0, 6).map((file) => URL.createObjectURL(file)));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const selectedTags = options.tags ? options.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const addTag = (tag) => {
    const t = tag.trim().toLowerCase();
    if (t && !selectedTags.includes(t)) {
      const next = [...selectedTags, t];
      setOptions({ ...options, tags: next.join(', ') });
      setExistingTags((prev) => [...new Set([...prev, t])].sort());
    }
    setTagInput('');
  };

  const removeTag = (tag) => {
    setOptions({ ...options, tags: selectedTags.filter((t) => t !== tag).join(', ') });
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setProgress(0);
    setError('');
    try {
      if (files.length === 1) {
        await images.upload(files[0], options, setProgress);
      } else {
        await images.batchUpload(files, options, setProgress);
      }
      navigate('/library');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUrlUpload = async () => {
    if (!remoteUrl.trim()) return;
    setUploading(true);
    setProgress(35);
    setError('');
    try {
      await images.uploadUrl({ ...options, url: remoteUrl.trim() });
      setProgress(100);
      navigate('/library');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Upload Image</h1>
        <p>Upload local files or import an image from a URL</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="upload-layout">
        <div className="card">
          <div
            className={`upload-zone ${dragOver ? 'dragover' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />
            {previews.length ? (
              <div className="preview-strip">
                {previews.map((preview) => <img key={preview} src={preview} alt="" />)}
              </div>
            ) : (
              <div className="icon"><UploadIcon size={48} /></div>
            )}
            <p>{files.length ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Drop images here or click to browse'}</p>
            <p className="hint">PNG, JPG, WebP, AVIF, GIF, TIFF up to 10MB each</p>
          </div>

          <div className="url-upload">
            <Link size={16} />
            <input
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            <button className="btn btn-ghost" onClick={handleUrlUpload} disabled={uploading || !remoteUrl.trim()}>
              Import
            </button>
          </div>

          {uploading && (
            <div className="progress">
              <div style={{ width: `${progress}%` }} />
              <span>{progress}%</span>
            </div>
          )}

          <div className="upload-actions">
            <button className="btn btn-ghost" onClick={() => { setFiles([]); setPreviews([]); }} disabled={uploading}>
              Clear
            </button>
            <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !files.length}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>

        <div className="card upload-options">
          <h2>Options</h2>
          <label>
            Tags
            <div className="tag-input-area">
              <div className="tag-chips">
                {selectedTags.map((tag) => (
                  <span key={tag} className="tag-chip">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>&times;</button>
                  </span>
                ))}
                <input
                  className="tag-text-input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder={selectedTags.length ? '' : 'Add tags...'}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                    if (e.key === 'Backspace' && !tagInput && selectedTags.length) {
                      removeTag(selectedTags[selectedTags.length - 1]);
                    }
                  }}
                />
              </div>
              {existingTags.filter((t) => !selectedTags.includes(t)).length > 0 && (
                <div className="tag-suggestions">
                  {existingTags.filter((t) => !selectedTags.includes(t)).map((tag) => (
                    <button key={tag} type="button" className="tag-chip tag-suggestion" onClick={() => addTag(tag)}>
                      + {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>
          <label>
            Folder
            {creatingFolder ? (
              <div className="folder-create-row">
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFolderName.trim()) {
                      const name = newFolderName.trim();
                      setOptions({ ...options, folder: name });
                      setExistingFolders((prev) => [...new Set([...prev, name])].sort());
                      setCreatingFolder(false);
                      setNewFolderName('');
                    }
                    if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName(''); }
                  }}
                />
                <div className="folder-create-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => { setCreatingFolder(false); setNewFolderName(''); }}>Cancel</button>
                  <button type="button" className="btn btn-primary" disabled={!newFolderName.trim()} onClick={() => {
                    const name = newFolderName.trim();
                    setOptions({ ...options, folder: name });
                    setExistingFolders((prev) => [...new Set([...prev, name])].sort());
                    setCreatingFolder(false);
                    setNewFolderName('');
                  }}>Create</button>
                </div>
              </div>
            ) : (
              <div className="folder-select-row">
                <select
                  value={existingFolders.includes(options.folder) ? options.folder : '__custom__'}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setCreatingFolder(true);
                    } else {
                      setOptions({ ...options, folder: e.target.value });
                    }
                  }}
                >
                  <option value="">No folder</option>
                  {existingFolders.map((f) => <option key={f} value={f}>{f}</option>)}
                  {options.folder && !existingFolders.includes(options.folder) && <option value="__custom__">{options.folder}</option>}
                  <option value="__new__">+ New folder</option>
                </select>
                {options.folder && existingFolders.includes(options.folder) && (
                  <button type="button" className="btn btn-ghost folder-clear" onClick={() => setOptions({ ...options, folder: '' })}>x</button>
                )}
              </div>
            )}
          </label>
          <label>Expires At<input type="datetime-local" value={options.expiresAt} onChange={(e) => setOptions({ ...options, expiresAt: e.target.value })} /></label>
          <label>Watermark<input value={options.watermarkText} onChange={(e) => setOptions({ ...options, watermarkText: e.target.value })} placeholder="Optional text" /></label>
          <label className="checkbox-row">
            <input type="checkbox" checked={options.stripExif} onChange={(e) => setOptions({ ...options, stripExif: e.target.checked })} />
            Strip EXIF metadata
          </label>
        </div>
      </div>
    </div>
  );
}
