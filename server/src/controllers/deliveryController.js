import { getImageFromCacheOrTransform, detectFormat } from '../services/imageService.js';
import { getFromR2 } from '../services/r2Service.js';
import Image from '../models/Image.js';

export const deliverImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const width = req.query.w ? parseInt(req.query.w) : null;
    const format = detectFormat(req.headers.accept);

    if (width && (width < 10 || width > 4000)) {
      return res.status(400).json({ error: 'Width must be between 10 and 4000' });
    }

    const image = await Image.findOne({ imageId });
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    if (!width) {
      const blob = await getFromR2(image.originalKey);
      const buffer = Buffer.from(await blob.arrayBuffer());

      res.set('Content-Type', image.mimetype);
      res.set('Cache-Control', 'public, max-age=31536000');
      return res.send(buffer);
    }

    const result = await getImageFromCacheOrTransform(imageId, width, format);
    if (!result) {
      return res.status(404).json({ error: 'Image processing failed' });
    }

    res.set('Content-Type', result.contentType);
    res.set('Cache-Control', result.fromCache
      ? 'public, max-age=31536000'
      : 'public, max-age=86400'
    );
    res.set('X-Cache', result.fromCache ? 'HIT' : 'MISS');
    res.send(result.buffer);
  } catch (error) {
    console.error('Delivery error:', error);
    res.status(500).json({ error: 'Image delivery failed' });
  }
};
