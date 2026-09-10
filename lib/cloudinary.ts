import "server-only";

import { v2 as cloudinary } from "cloudinary";
import type { UploadApiOptions, UploadApiResponse } from "cloudinary";

/**
 * Client Cloudinary (serveur uniquement).
 *
 * `import "server-only"` empêche ce module — et donc l'API secret — de
 * se retrouver dans le bundle du navigateur.
 *
 * La config est lue à l'import : Next injecte `.env.local` avant.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/** Vrai dès qu'un compte Cloudinary est renseigné (URL unique ou trio cloud/clé/secret). */
export function cloudinaryEstConfigure(): boolean {
  if (process.env.CLOUDINARY_URL) return true;

  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

/** Envoie un buffer d'image vers Cloudinary et renvoie la réponse du CDN. */
export function envoyerImageCloudinary(
  fichier: Buffer,
  options: UploadApiOptions,
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) {
        reject(error ?? new Error("Cloudinary n'a renvoyé aucune image."));
        return;
      }

      resolve(result);
    });

    stream.end(fichier);
  });
}
