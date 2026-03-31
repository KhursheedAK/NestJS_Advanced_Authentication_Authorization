import { memoryStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// used for actual saving after validation
export const saveFileToDisk = async (
  file: Express.Multer.File,
): Promise<string> => {
  if (!existsSync('./uploads')) {
    await mkdir('./uploads', { recursive: true });
  }
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = extname(file.originalname);
  const filename = `profile-${uniqueSuffix}${ext}`;
  await writeFile(`./uploads/${filename}`, file.buffer);
  return filename;
};

// memory storage — file never touches disk
export const multerConfig = {
  storage: memoryStorage(), // ← holds file in memory, not disk

  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      callback(
        new BadRequestException('Only jpeg, jpg, png files are allowed'),
        false,
      );
      return;
    }
    callback(null, true);
  },

  limits: {
    fileSize: 2 * 1024 * 1024,
  },
};
