import { v4 as uuidv4 } from 'uuid';
import Image from '../models/Image.js';
import { uploadToR2, getOriginalKey, getPublicUrl } from '../services/r2Service.js';
import { getOriginalMetadata } from '../services/imageService.js';
import { recordUpload } from '../services/analyticsService.js';

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageId = uuidv4();
    const originalKey = getOriginalKey(imageId, req.file.originalname);

    await uploadToR2(originalKey, req.file.buffer, req.file.mimetype);

    const metadata = await getOriginalMetadata(req.file.buffer);

    const image = await Image.create({
      imageId,
      ownerId: req.user._id,
      originalKey,
      originalSize: req.file.size,
      width: metadata.width,
      height: metadata.height,
      mimetype: req.file.mimetype,
      originalName: req.file.originalname,
    });

    await recordUpload(req.user._id, req.file.size);

    res.status(201).json({
      image: {
        ...image.toObject(),
        url: getPublicUrl(originalKey),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getImage = async (req, res) => {
  try {
    const image = await Image.findOne({ imageId: req.params.imageId });
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({
      image: {
        ...image.toObject(),
        url: getPublicUrl(image.originalKey),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserImages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const images = await Image.find({ ownerId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Image.countDocuments({ ownerId: req.user._id });

    res.json({
      images: images.map((img) => ({
        ...img.toObject(),
        url: getPublicUrl(img.originalKey),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const image = await Image.findOne({
      imageId: req.params.imageId,
      ownerId: req.user._id,
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    await Image.deleteOne({ _id: image._id });

    res.json({ message: 'Image deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
