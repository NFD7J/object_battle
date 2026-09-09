import { put } from "@vercel/blob";

import { apiError, handleApiError } from "@/lib/api";

/* ===========================================================================
   POST /api/upload?filename=marteau.png

   Envoie l'image d'un objet sur le CDN Vercel Blob (§7) et renvoie son URL,
   à placer ensuite dans le champ « image » de POST /api/objets.

   Même principe que app/avatar/uploads : le fichier est streamé directement
   dans le corps de la requête, sans passer par un FormData. On y ajoute les
   contrôles attendus au §16, car un envoi de fichier est la porte d'entrée la
   plus exposée d'un site : type réel, taille, et nom de fichier reconstruit.
   =========================================================================== */

/** Seuls ces formats sont acceptés ; l'extension est déduite du type, pas du nom. */
const TYPES_AUTORISES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const TAILLE_MAX_OCTETS = 4 * 1024 * 1024; // 4 Mo

/**
 * Reconstruit un nom de fichier sûr à partir de celui envoyé par le navigateur.
 *
 * On ne réutilise jamais la chaîne telle quelle : elle pourrait contenir des
 * « ../ » ou des séparateurs de chemin et faire écrire le fichier ailleurs que
 * dans le dossier prévu.
 */
function nomDeFichierSur(nomBrut: string, extension: string): string {
  const base = nomBrut
    .replace(/\.[^.]+$/, "") // retire l'extension d'origine
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${base || "objet"}.${extension}`;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const filename = new URL(request.url).searchParams.get("filename");

    if (!filename) {
      return apiError(400, "VALIDATION", "Le paramètre « filename » est obligatoire.");
    }

    const contentType = request.headers.get("content-type")?.split(";")[0].trim() ?? "";
    const extension = TYPES_AUTORISES[contentType];

    if (!extension) {
      return apiError(
        415,
        "TYPE_REFUSE",
        `Format « ${contentType || "inconnu"} » refusé. Formats acceptés : PNG, JPEG, WEBP.`,
      );
    }

    // Content-Length est absent en envoi par morceaux : on ne contrôle que
    // lorsqu'il est fourni, Vercel Blob applique ses propres limites ensuite.
    const taille = Number(request.headers.get("content-length") ?? 0);

    if (taille > TAILLE_MAX_OCTETS) {
      return apiError(
        413,
        "FICHIER_TROP_LOURD",
        `Image trop lourde (${Math.round(taille / 1024 / 1024)} Mo). Maximum : 4 Mo.`,
      );
    }

    if (!request.body) {
      return apiError(400, "VALIDATION", "Aucun fichier reçu.");
    }

    // La requête est valide : reste à vérifier que le serveur est configuré.
    // Ce contrôle vient après, pour qu'un client fautif reçoive bien une
    // erreur 4xx qui le concerne, et non une 500 qui parle du serveur.
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return apiError(
        500,
        "CONFIG_MANQUANTE",
        "BLOB_READ_WRITE_TOKEN n'est pas défini : impossible d'envoyer l'image.",
      );
    }

    const blob = await put(
      `objets/${nomDeFichierSur(filename, extension)}`,
      request.body,
      {
        access: "public",
        contentType,
        // Deux objets nommés « marteau.png » ne doivent pas s'écraser l'un
        // l'autre : Blob ajoute un suffixe aléatoire au chemin.
        addRandomSuffix: true,
      },
    );

    return Response.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
