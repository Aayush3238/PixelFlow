import supabase, { BUCKET_NAME, SUPABASE_URL } from '../config/r2.js';

export const uploadToR2 = async (key, body, contentType) => {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(key, body, {
      contentType,
      upsert: false,
    });

  if (error) throw error;
  return key;
};

export const getFromR2 = async (key) => {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(key);

  if (error) throw error;
  return data;
};

export const existsInR2 = async (key) => {
  const { data } = await supabase.storage
    .from(BUCKET_NAME)
    .list(key.split('/').slice(0, -1).join('/'), {
      search: key.split('/').pop(),
    });

  return data && data.length > 0;
};

export const getPublicUrl = (key) => {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(key);

  return data.publicUrl;
};

export const deleteFromR2 = async (key) => {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([key]);

  if (error) throw error;
};

export const getTransformedKey = (imageId, width, format) => {
  return `transformed/${format}/${imageId}_${width}.${format}`;
};

export const getOriginalKey = (imageId, originalName) => {
  const ext = originalName.split('.').pop();
  return `originals/${imageId}.${ext}`;
};
