/**
 * middlewares/upload.middleware.ts
 * Cấu hình Multer để xử lý upload file (ảnh)
 * Sau đó upload lên Cloudinary
 */

import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import cloudinary from '../config/cloudinary';
import { AppError } from './error.middleware';
import { UploadedFile } from '../types';

// Lưu file trong memory (buffer) thay vì disk để upload lên Cloudinary
const storage = multer.memoryStorage();

// Filter chỉ cho phép upload ảnh
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true); // Chấp nhận file
  } else {
    cb(new AppError('Chỉ được upload file ảnh (JPEG, PNG, WEBP, GIF)', 400));
  }
};

// Cấu hình multer: giới hạn 5MB mỗi file, tối đa 10 files
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10,
  },
});

/**
 * Upload một ảnh lên Cloudinary
 * @param buffer - Buffer của file
 * @param folder - Thư mục lưu trên Cloudinary
 * @returns Thông tin file đã upload
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string
): Promise<UploadedFile> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `rms/${folder}`,
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) {
            reject(new AppError('Upload ảnh thất bại', 500));
            return;
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            size: result.bytes,
          });
        }
      )
      .end(buffer);
  });
};

/**
 * Upload nhiều ảnh cùng lúc lên Cloudinary
 * @param files - Mảng file từ multer
 * @param folder - Thư mục lưu trên Cloudinary
 * @returns Mảng URL của các ảnh đã upload
 */
export const uploadMultipleImages = async (
  files: Express.Multer.File[],
  folder: string
): Promise<string[]> => {
  const uploadPromises = files.map((file) =>
    uploadToCloudinary(file.buffer, folder)
  );
  const results = await Promise.all(uploadPromises);
  return results.map((r) => r.url);
};

/**
 * Middleware wrapper để xử lý lỗi multer
 */
export const handleUploadError = (
  err: Error,
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      next(new AppError('File quá lớn. Giới hạn 5MB mỗi file', 400));
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      next(new AppError('Quá nhiều file. Tối đa 10 file', 400));
    } else {
      next(new AppError(err.message, 400));
    }
  } else {
    next(err);
  }
};
