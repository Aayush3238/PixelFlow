import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { images } from '../api/client';
import { Upload as UploadIcon } from 'lucide-react';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();
  const navigate = useNavigate();

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    setFile(f);
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await images.upload(file);
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
        <p>Upload images to your PixelFlow library</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

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
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {preview ? (
            <img src={preview} alt="Preview" style={{ maxHeight: 240, borderRadius: 8, marginBottom: 16 }} />
          ) : (
            <div className="icon">
              <UploadIcon size={48} />
            </div>
          )}
          <p>{file ? file.name : 'Drop an image here or click to browse'}</p>
          <p className="hint">PNG, JPG, WebP, AVIF up to 10MB</p>
        </div>

        {file && (
          <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => { setFile(null); setPreview(null); }}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Image'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
