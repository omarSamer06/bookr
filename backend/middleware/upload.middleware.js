import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Disk staging avoids buffering whole files in RAM while Multer passes streams to Cloudinary
const uploadRoot = path.join(__dirname, '../uploads/temp');
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadRoot);
  },
  filename(_req, file, cb) {
    const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, safe);
  },
});

const imageFilter = (_req, file, cb) => {
  const ok = /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype);
  if (!ok) {
    cb(new Error('Only JPEG, PNG, WebP, or GIF images are allowed'));
    return;
  }
  cb(null, true);
};

const limits = { fileSize: 5 * 1024 * 1024 };

const multerInstance = multer({
  storage,
  limits,
  fileFilter: imageFilter,
});

/** Profile-style single asset uploads */
export const uploadSingle = multerInstance.single('image');

/** Gallery uploads capped at five files per request to match booking UX expectations */
export const uploadMultiple = multerInstance.array('images', 5);

/** Converts Multer failures into JSON instead of hanging Express with raw errors */
export function wrapMulter(uploadMw) {
  return (req, res, next) => {
    uploadMw(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const msg =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'Each image must be under 5MB'
            : err.code === 'LIMIT_FILE_COUNT'
              ? 'Too many files in this upload'
              : err.message;
        return res.status(400).json({
          success: false,
          message: msg,
          data: {},
        });
      }
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
          data: {},
        });
      }
      next();
    });
  };
}
