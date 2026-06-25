import supabase, { BUCKET_NAME } from '../config/storage.js';

export const uploadToStorage = async (key, body, contentType) => {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(key, body, {
      contentType,
      upsert: false,
    });

  if (error) throw error;
  return key;
};

export const getFromStorage = async (key) => {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(key);

  if (error) throw error;
  return data;
};

export const getPublicUrl = (key) => {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(key);

  return data.publicUrl;
};

export const deleteFromStorage = async (key) => {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([key]);

  if (error) throw error;
};

export const deleteMultipleFromStorage = async (keys) => {
  if (keys.length === 0) return;
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(keys);

  if (error) throw error;
};

export const listByPrefix = async (prefix) => {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(prefix);

  if (error) throw error;
  return data || [];
};

export const getTransformedKey = (imageId, width, format) => {
  return `transformed/${format}/${imageId}_${width}.${format}`;
};

export const getOriginalKey = (imageId, originalName) => {
  const ext = originalName.split('.').pop();
  return `originals/${imageId}.${ext}`;
};
