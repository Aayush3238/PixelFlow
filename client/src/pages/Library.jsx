import { useState, useEffect } from 'react';
import { images } from '../api/client';
import { Trash2, ExternalLink, Copy } from 'lucide-react';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Library() {
  const [imagesList, setImagesList] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [page, setPage] = useState(1);

  const loadImages = (p) => {
    setLoading(true);
    images.list(p)
      .then((data) => {
        setImagesList(data.images);
        setPagination(data.pagination);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadImages(page);
  }, [page]);

  const handleDelete = async (imageId) => {
    if (!confirm('Delete this image?')) return;
    try {
      await images.delete(imageId);
      setImagesList((prev) => prev.filter((img) => img.imageId !== imageId));
    } catch (err) {
      alert(err.message);
    }
  };

  const copyUrl = (imageId) => {
    const base = window.location.origin;
    navigator.clipboard.writeText(`${base}/i/${imageId}`);
  };

  if (loading && imagesList.length === 0) {
    return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Loading...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Image Library</h1>
        <p>Manage your uploaded images</p>
      </div>

      {imagesList.length === 0 ? (
        <div className="empty-state">
          <p>No images uploaded yet.</p>
          <a href="/upload" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
            Upload your first image
          </a>
        </div>
      ) : (
        <>
          <div className="image-grid">
            {imagesList.map((img) => (
              <div key={img.imageId} className="image-card">
                <img
                  src={`${img.url}`}
                  alt={img.originalName}
                  loading="lazy"
                  onClick={() => setSelectedImage(img)}
                  style={{ cursor: 'pointer' }}
                />
                <div className="info">
                  <div className="name">{img.originalName}</div>
                  <div className="meta">
                    {formatBytes(img.originalSize)} · {img.width}×{img.height}
                  </div>
                </div>
                <div className="actions">
                  <button className="btn btn-ghost" onClick={() => copyUrl(img.imageId)}>
                    <Copy size={12} /> Copy URL
                  </button>
                  <button className="btn btn-ghost" onClick={() => handleDelete(img.imageId)}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                className="btn btn-ghost"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
                Page {page} of {pagination.pages}
              </span>
              <button
                className="btn btn-ghost"
                disabled={page === pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {selectedImage && (
        <div className="preview-modal" onClick={() => setSelectedImage(null)}>
          <div className="content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage.url} alt={selectedImage.originalName} />
            <div className="details">
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>{selectedImage.originalName}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                <div>Size: {formatBytes(selectedImage.originalSize)}</div>
                <div>Dimensions: {selectedImage.width}×{selectedImage.height}</div>
                <div>Requests: {selectedImage.requests}</div>
                <div>Bandwidth saved: {formatBytes(selectedImage.bandwidthSaved)}</div>
                <div>Uploaded: {formatDate(selectedImage.createdAt)}</div>
                <div>Formats: {selectedImage.formatsGenerated.join(', ') || 'none yet'}</div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={() => copyUrl(selectedImage.imageId)}>
                  <Copy size={14} /> Copy Delivery URL
                </button>
                <a
                  className="btn btn-ghost"
                  href={`/i/${selectedImage.imageId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={14} /> Open Original
                </a>
                <button className="btn btn-ghost" onClick={() => setSelectedImage(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
