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
          <label>Tags<input value={options.tags} onChange={(e) => setOptions({ ...options, tags: e.target.value })} placeholder="hero, product" /></label>
          <label>Folder<input value={options.folder} onChange={(e) => setOptions({ ...options, folder: e.target.value })} placeholder="campaigns" /></label>
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
