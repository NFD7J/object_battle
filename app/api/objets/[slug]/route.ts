import type { NextRequest } from "next/server";

import { apiError, handleApiError } from "@/lib/api";
import { getFightsByObject, getObjectBySlug } from "@/lib/queries";

/**
 * GET /api/objets/[slug]
 * Fiche d'un objet, avec ses derniers combats.
 *
 * Exemple : /api/objets/marteau
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/objets/[slug]">,
): Promise<Response> {
  try {
    const { slug } = await context.params;
    const objet = await getObjectBySlug(slug);

    if (!objet) {
      return apiError(404, "INTROUVABLE", `Aucun objet ne correspond à « ${slug} ».`);
    }

    const combats = await getFightsByObject(objet.id);

    return Response.json({ objet, combats });
  } catch (error) {
    return handleApiError(error);
  }
}
