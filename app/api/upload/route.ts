import { apiError, handleApiError } from "@/lib/api";
import { getCurrentPlayerId } from "@/lib/auth";
import {
  cloudinaryEstConfigure,
  envoyerImageCloudinary,
} from "@/lib/cloudinary";

/* ===========================================================================
   POST /api/upload?filename=marteau.png

   Envoie l'image d'un objet sur Cloudinary et renvoie son URL publique,
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
 * Reconstruit un identifiant sûr à partir du nom envoyé par le navigateur.
 *
 * On ne réutilise jamais la chaîne telle quelle : elle pourrait contenir des
 * « ../ » ou des séparateurs de chemin. L'extension est ignorée : Cloudinary
 * la déduit du contenu.
 */
function identifiantSur(nomBrut: string): string {
  const base = nomBrut
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return base || "objet";
}

export async function POST(request: Request): Promise<Response> {
  try {
    const playerId = await getCurrentPlayerId();

    if (playerId === null) {
      return apiError(
        401,
        "NON_AUTHENTIFIE",
        "Connectez-vous pour envoyer une image.",
      );
    }

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
    // lorsqu'il est fourni, puis on revérifie après lecture du corps.
    const tailleAnnoncee = Number(request.headers.get("content-length") ?? 0);

    if (tailleAnnoncee > TAILLE_MAX_OCTETS) {
      return apiError(
        413,
        "FICHIER_TROP_LOURD",
        `Image trop lourde (${Math.round(tailleAnnoncee / 1024 / 1024)} Mo). Maximum : 4 Mo.`,
      );
    }

    if (!request.body) {
      return apiError(400, "VALIDATION", "Aucun fichier reçu.");
    }

    const fichier = Buffer.from(await request.arrayBuffer());

    if (fichier.byteLength === 0) {
      return apiError(400, "VALIDATION", "Aucun fichier reçu.");
    }

    if (fichier.byteLength > TAILLE_MAX_OCTETS) {
      return apiError(
        413,
        "FICHIER_TROP_LOURD",
        `Image trop lourde (${Math.round(fichier.byteLength / 1024 / 1024)} Mo). Maximum : 4 Mo.`,
      );
    }

    // La requête est valide : reste à vérifier que le serveur est configuré.
    // Ce contrôle vient après, pour qu'un client fautif reçoive bien une
    // erreur 4xx qui le concerne, et non une 500 qui parle du serveur.
    if (!cloudinaryEstConfigure()) {
      return apiError(
        500,
        "CONFIG_MANQUANTE",
        "Cloudinary n'est pas configuré : CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET sont requis.",
      );
    }

    const resultat = await envoyerImageCloudinary(fichier, {
      folder: "object-battle/objets",
      filename_override: identifiantSur(filename),
      resource_type: "image",
      overwrite: false,
      unique_filename: true,
      use_filename: true,
    });

    return Response.json({
      url: resultat.secure_url,
      pathname: resultat.public_id,
      contentType,
    });
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : null;

    if (error && typeof error === "object" && "http_code" in error && message) {
      return apiError(502, "CLOUDINARY", `L'envoi vers Cloudinary a échoué : ${message}`);
    }

    return handleApiError(error);
  }
}
