import { handleApiError, readJsonBody } from "@/lib/api";
import { createObject, getAllObjects } from "@/lib/queries";

/**
 * GET /api/objets
 * Tous les objets, du meilleur score global au moins bon.
 */
export async function GET(): Promise<Response> {
  try {
    const objets = await getAllObjects();
    return Response.json({ objets });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/objets
 * Crée un objet à partir du formulaire « Créer un objet » (§4.3).
 *
 * Corps attendu :
 * {
 *   "name": "Marteau",
 *   "description": "…",
 *   "image": "https://res.cloudinary.com/<cloud>/image/upload/…/marteau.png",
 *   "stats": { "puissance": 90, "resistance": 75, "rapidite": 50, "intelligence": 70 }
 * }
 *
 * Les champs ne sont pas validés ici mais dans createObject(), qui les reçoit
 * en `unknown` : un seul endroit contrôle les données, quelle que soit leur
 * provenance (§16).
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);

    const objet = await createObject({
      name: body.name,
      description: body.description,
      image: body.image,
      stats: body.stats,
    });

    return Response.json(
      { objet },
      { status: 201, headers: { Location: `/api/objets/${objet.slug}` } },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
