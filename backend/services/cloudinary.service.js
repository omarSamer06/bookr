import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';

// Cloudinary SDK reads credentials from env so keys never ship in client bundles or logs
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Turns a stored secure_url back into destroy-able public_id without expanding the schema */
export function extractPublicIdFromUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid image URL');
  }
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) {
    throw new Error('URL is not a Cloudinary asset');
  }
  let tail = url.slice(idx + marker.length).split('?')[0];
  const segments = tail.split('/');
  let i = 0;
  while (
    i < segments.length &&
    (segments[i].includes(',') || /^v\d+$/.test(segments[i]))
  ) {
    i += 1;
  }
  let publicId = segments.slice(i).join('/');
  publicId = publicId.replace(/\.[^/.]+$/, '');
  if (!publicId) {
    throw new Error('Could not resolve Cloudinary public id');
  }
  return publicId;
}

/** Streams local Multer temp file into Cloudinary under a stable folder prefix */
export async function uploadImage(filePath, folder = 'bookr/businesses') {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: 'image',
  });
  await fs.unlink(filePath).catch(() => {});
  return result.secure_url;
}

/** Removes orphaned CDN assets when URLs are dropped from Mongo */
export async function deleteImage(publicId) {
  const res = await cloudinary.uploader.destroy(publicId);
  return res;
}
