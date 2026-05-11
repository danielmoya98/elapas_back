import { Injectable } from '@nestjs/common';

import { UploadApiResponse } from 'cloudinary';

import { cloudinary } from './cloudinary.provider';

@Injectable()
export class CloudinaryService {
  async uploadFile(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse> {
    return new Promise(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: 'elapas',
            },

            (error, result) => {
              if (error) {
                return reject(error);
              }

              resolve(
                result as UploadApiResponse,
              );
            },
          )
          .end(file.buffer);
      },
    );
  }
}
