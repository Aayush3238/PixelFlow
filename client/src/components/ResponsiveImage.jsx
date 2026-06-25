import { useState } from 'react';

const WIDTH_PRESETS = [300, 600, 1200];

export default function ResponsiveImage({
  imageId,
  originalWidth,
  originalName,
  blurDataURL,
  className,
  style,
  onClick,
  onMouseEnter,
}) {
  const [loaded, setLoaded] = useState(false);

  const availableWidths = WIDTH_PRESETS.filter((w) => w < originalWidth);
  if (availableWidths.length === 0) availableWidths.push(Math.min(originalWidth, 300));

  const fallbackWidth = availableWidths[0];
  const fallbackUrl = `/i/${imageId}?w=${fallbackWidth}`;

  const buildSrcSet = (format) =>
    availableWidths.map((w) => `/i/${imageId}?w=${w}&format=${format} ${w}w`).join(', ');

  const buildSizes = () => {
    if (style?.width) return style.width;
    return '(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw';
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', ...style }}>
      {blurDataURL && (
        <img
          src={blurDataURL}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
            opacity: loaded ? 0 : 1,
            transition: 'opacity 0.3s ease-out',
          }}
        />
      )}
      <picture>
        <source srcSet={buildSrcSet('avif')} sizes={buildSizes()} type="image/avif" />
        <source srcSet={buildSrcSet('webp')} sizes={buildSizes()} type="image/webp" />
        <img
          src={fallbackUrl}
          alt={originalName}
          loading="lazy"
          decoding="async"
          className={className}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease-out',
            ...style,
          }}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onLoad={() => setLoaded(true)}
        />
      </picture>
    </div>
  );
}
