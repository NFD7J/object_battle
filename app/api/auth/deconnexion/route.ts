import { handleApiError } from "@/lib/api";
import { deconnecter } from "@/lib/auth";

/**
 * POST /api/auth/deconnexion
 * Supprime le cookie de session.
 *
 * En POST et non en GET : une deconnexion modifie l'etat, et un GET pourrait
 * etre declenche par un simple <img src> sur un autre site.
 */
export async function POST(): Promise<Response> {
  try {
    await deconnecter();
    return Response.json({ deconnecte: true });
  } catch (error) {
    return handleApiError(error);
  }
}
