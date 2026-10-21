// config/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import settings from './settings_config';

cloudinary.config({
  cloud_name: settings().cloudinaryCloudName,
  api_key: settings().cloudinaryApiKey,
  api_secret: settings().cloudinaryApiSecret,
  secure: true,
});

export default cloudinary;

/**
 * Generates a signature for frontend direct-to-Cloudinary uploads.
 * Prevents exposing your API secret to the client.
 */
export function generateCloudinarySignature(folder: string = 'templates') {
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
    },
    settings().cloudinaryApiSecret
  );

  return {
    timestamp,
    signature,
    cloudName: settings().cloudinaryCloudName,
    apiKey: settings().cloudinaryApiKey,
    folder,
  };
}