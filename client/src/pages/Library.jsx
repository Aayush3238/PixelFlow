import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { images } from '../api/client';
import { CheckSquare, Code, Copy, Edit3, ExternalLink, Search, Trash2 } from 'lucide-react';
import { formatBytes } from '../utils/format';
import { serverOrigin, imageUrl } from '../utils/serverUrl';
import ResponsiveImage from '../components/ResponsiveImage';
import Skeleton from '../components/Skeleton';

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

export default function Library() {
  const [imagesList, setImagesList] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState('');
  const [page, setPage] = useState(1);
  const [editName, setEditName] = useState('');
  const loaderRef = useRef(null);

  const canLoadMore = pagination && page < pagination.pages;

  const loadImages = useCallback((nextPage = 1, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    images.list({ page: nextPage, q: query, folder })
      .then((data) => {
        setImagesList((prev) => append ? [...prev, ...data.images] : data.images);
        setPagination(data.pagination);
        setPage(nextPage);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, [folder, query]);

  useEffect(() => {
    const timer = setTimeout(() => loadImages(1, false), 250);
    return () => clearTimeout(timer);
  }, [loadImages]);

  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && canLoadMore && !loadingMore) loadImages(page + 1, true);
    }, { rootMargin: '400px' });
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [canLoadMore, loadImages, loadingMore, page]);

  useEffect(() => {
    if (!selectedImage) return;
    setEditName(selectedImage.originalName);
    const onKeyDown = (event) => {
      const index = imagesList.findIndex((img) => img.imageId === selectedImage.imageId);
      if (event.key === 'Escape') setSelectedImage(null);
      if (event.key === 'ArrowRight' && imagesList[index + 1]) setSelectedImage(imagesList[index + 1]);
      if (event.key === 'ArrowLeft' && imagesList[index - 1]) setSelectedImage(imagesList[index - 1]);
      if (event.key === 'Delete') handleDelete(selectedImage.imageId);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [imagesList, selectedImage]);

  const selectedCount = selectedIds.size;
  const folders = useMemo(() => [...new Set(imagesList.map((img) => img.folder).filter(Boolean))], [imagesList]);

  const toggleSelected = (imageId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(imageId) ? next.delete(imageId) : next.add(imageId);
      return next;
    });
  };

  const handleDelete = async (imageId) => {
    if (!confirm('Delete this image?')) return;
    await images.delete(imageId);
    setImagesList((prev) => prev.filter((img) => img.imageId !== imageId));
    setSelectedImage(null);
  };

  const handleBulkDelete = async () => {
    if (!selectedCount || !confirm(`Delete ${selectedCount} selected image${selectedCount > 1 ? 's' : ''}?`)) return;
    const ids = [...selectedIds];
    await images.bulkDelete(ids);
    setImagesList((prev) => prev.filter((img) => !selectedIds.has(img.imageId)));
    setSelectedIds(new Set());
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
  };

  const updateSelected = async () => {
    const data = await images.update(selectedImage.imageId, { originalName: editName });
    setImagesList((prev) => prev.map((img) => img.imageId === data.image.imageId ? data.image : img));
    setSelectedImage(data.image);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Image Library</h1>
        <p>Search, organize, preview, and copy delivery snippets</p>
      </div>

      <div className="library-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search images, tags, folders" />
        </div>
        <select value={folder} onChange={(e) => setFolder(e.target.value)}>
          <option value="">All folders</option>
          {folders.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={handleBulkDelete} disabled={!selectedCount}>
          <Trash2 size={14} /> Delete {selectedCount || ''}
        </button>
      </div>

      {loading && imagesList.length === 0 ? (
        <div className="image-grid">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="image-skeleton" />)}</div>
      ) : imagesList.length === 0 ? (
        <div className="empty-state">
          <p>No images found.</p>
          <a href="/upload" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>Upload images</a>
        </div>
      ) : (
        <>
          <div className="image-grid">
            {imagesList.map((img) => {
              const url = imageUrl(img.imageId);
              return (
                <div key={img.imageId} className={`image-card ${selectedIds.has(img.imageId) ? 'selected' : ''}`}>
                  <button className="select-btn" onClick={() => toggleSelected(img.imageId)} title="Select image">
                    <CheckSquare size={16} />
                  </button>
                  <ResponsiveImage
                    imageId={img.imageId}
                    originalWidth={img.width}
                    originalName={img.originalName}
                    blurDataURL={img.blurDataURL}
                    onClick={() => setSelectedImage(img)}
                    onMouseEnter={() => { const preload = new Image(); preload.src = imageUrl(img.imageId); }}
                    style={{ cursor: 'pointer', height: 200 }}
                  />
                  <div className="info">
                    <div className="name">{img.originalName}</div>
                    <div className="meta">{formatBytes(img.originalSize)} | {img.width}x{img.height}</div>
                    {!!img.tags?.length && <div className="tags">{img.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
                  </div>
                  <div className="actions">
                    <button className="btn btn-ghost" onClick={() => copyText(url)}><Copy size={12} /> URL</button>
                    <button className="btn btn-ghost" onClick={() => copyText(`![${img.originalName}](${url})`)}><Code size={12} /> MD</button>
                    <button className="btn btn-ghost" onClick={() => handleDelete(img.imageId)}><Trash2 size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>
          <div ref={loaderRef} className="load-more">{loadingMore ? 'Loading more...' : canLoadMore ? 'Scroll for more' : 'End of library'}</div>
        </>
      )}

      {selectedImage && (
        <div className="preview-modal" onClick={() => setSelectedImage(null)}>
          <div className="content comparison-content" onClick={(e) => e.stopPropagation()}>
            <div className="comparison">
              <figure><img src={selectedImage.url || imageUrl(selectedImage.imageId)} alt="" /><figcaption>Original</figcaption></figure>
              <figure><img src={imageUrl(selectedImage.imageId, 'w=600&format=webp')} alt={selectedImage.originalName} /><figcaption>Optimized preview</figcaption></figure>
            </div>
            <div className="details">
              <div className="rename-row">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                <button className="btn btn-ghost" onClick={updateSelected}><Edit3 size={14} /> Rename</button>
              </div>
              <div className="detail-grid">
                <div>Size: {formatBytes(selectedImage.originalSize)}</div>
                <div>Dimensions: {selectedImage.width}x{selectedImage.height}</div>
                <div>Requests: {selectedImage.requests}</div>
                <div>Bandwidth saved: {formatBytes(selectedImage.bandwidthSaved)}</div>
                <div>Uploaded: {formatDate(selectedImage.createdAt)}</div>
                <div>Formats: {selectedImage.formatsGenerated.join(', ') || 'none yet'}</div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-primary" onClick={() => copyText(imageUrl(selectedImage.imageId))}><Copy size={14} /> Copy URL</button>
                <button className="btn btn-ghost" onClick={() => copyText(`<img src="${imageUrl(selectedImage.imageId)}" alt="${escapeHtml(selectedImage.originalName)}">`)}><Code size={14} /> HTML</button>
                <a className="btn btn-ghost" href={imageUrl(selectedImage.imageId)} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Open</a>
                <button className="btn btn-ghost" onClick={() => setSelectedImage(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
