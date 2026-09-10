import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

import { apiError, handleApiError } from "@/lib/api";

/* ===========================================================================
   POST /api/upload?filename=marteau.png

   Envoie l'image d'un objet sur Cloudinary (§7) et renvoie son URL, à placer
   ensuite dans le champ « image » de POST /api/objets.

   Le fichier est streamé directement dans le corps de la requête, sans
   FormData. Il transite par notre serveur plutôt que d'aller directement du
   navigateur vers Cloudinary : c'est ce qui permet de contrôler le type réel,
   la taille et le nom du fichier avant stockage (§16), et de garder la clé
   secrète Cloudinary hors du navigateur.
   =========================================================================== */

/** Seuls ces formats sont acceptés ; l'extension est déduite du type, pas du nom. */
const TYPES_AUTORISES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const TAILLE_MAX_OCTETS = 4 * 1024 * 1024; // 4 Mo

/** Dossier Cloudinary où atterrissent les images d'objets. */
const DOSSIER = "object-battle/objets";

/**
 * Reconstruit un nom de fichier sûr à partir de celui envoyé par le navigateur.
 *
 * On ne réutilise jamais la chaîne telle quelle : elle pourrait contenir des
 * « ../ » ou des séparateurs de chemin et faire écrire le fichier ailleurs que
 * dans le dossier prévu.
 */
function nomDeFichierSur(nomBrut: string): string {
  const base = nomBrut
    .replace(/\.[^.]+$/, "") // retire l'extension d'origine
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return base || "objet";
}

/**
 * Cloudinary lit sa configuration dans CLOUDINARY_URL, de la forme
 * cloudinary://<api_key>:<api_secret>@<cloud_name>.
 * On configure explicitement pour pouvoir donner une erreur claire si absent.
 */
function configurer(): boolean {
  const url = process.env.CLOUDINARY_URL;

  if (!url) return false;

  cloudinary.config({ secure: true });

  return Boolean(cloudinary.config().cloud_name);
}

/** Enveloppe upload_stream, qui fonctionne par callback, dans une promesse. */
function envoyerACloudinary(
  fichier: Buffer,
  publicId: string,
): Promise<UploadApiResponse> {
  return new Promise((resolve, rejeter) => {
    const flux = cloudinary.uploader.upload_stream(
      {
        folder: DOSSIER,
        public_id: publicId,
        resource_type: "image",
        // Cloudinary ajoute un suffixe aléatoire : deux objets nommés
        // « marteau.png » ne s'écrasent pas l'un l'autre.
        unique_filename: true,
        overwrite: false,
        // Deuxième garde-fou, après notre propre contrôle du content-type.
        allowed_formats: ["png", "jpg", "jpeg", "webp"],
      },
      (erreur, resultat) => {
        if (erreur || !resultat) {
          rejeter(erreur ?? new Error("Cloudinary n'a rien renvoyé."));
          return;
        }
        resolve(resultat);
      },
    );

    flux.end(fichier);
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const filename = new URL(request.url).searchParams.get("filename");

    if (!filename) {
      return apiError(400, "VALIDATION", "Le paramètre « filename » est obligatoire.");
    }

    const contentType = request.headers.get("content-type")?.split(";")[0].trim() ?? "";

    if (!TYPES_AUTORISES[contentType]) {
      return apiError(
        415,
        "TYPE_REFUSE",
        `Format « ${contentType || "inconnu"} » refusé. Formats acceptés : PNG, JPEG, WEBP.`,
      );
    }

    if (!request.body) {
      return apiError(400, "VALIDATION", "Aucun fichier reçu.");
    }

    // La requête est valide : reste à vérifier que le serveur est configuré.
    // Ce contrôle vient après, pour qu'un client fautif reçoive bien une
    // erreur 4xx qui le concerne, et non une 500 qui parle du serveur.
    if (!configurer()) {
      return apiError(
        500,
        "CONFIG_MANQUANTE",
        "CLOUDINARY_URL n'est pas défini : impossible d'envoyer l'image.",
      );
    }

    // On lit le fichier en mémoire : acceptable car plafonné à 4 Mo. La taille
    // réelle est vérifiée ici, et pas seulement via l'en-tête Content-Length
    // qui peut mentir ou manquer en envoi par morceaux.
    const fichier = Buffer.from(await request.arrayBuffer());

    if (fichier.byteLength === 0) {
      return apiError(400, "VALIDATION", "Le fichier reçu est vide.");
    }

    if (fichier.byteLength > TAILLE_MAX_OCTETS) {
      return apiError(
        413,
        "FICHIER_TROP_LOURD",
        `Image trop lourde (${(fichier.byteLength / 1024 / 1024).toFixed(1)} Mo). Maximum : 4 Mo.`,
      );
    }

    const resultat = await envoyerACloudinary(fichier, nomDeFichierSur(filename));

    return Response.json({
      url: resultat.secure_url,
      pathname: resultat.public_id,
      contentType: `image/${resultat.format}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
