import type { NextRequest } from "next/server";

import { apiError, handleApiError } from "@/lib/api";
import { getFightById } from "@/lib/queries";

/**
 * GET /api/combats/[id]
 * Détail d'un combat précis.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/combats/[id]">,
): Promise<Response> {
  try {
    const { id } = await context.params;
    const identifiant = Number(id);

    if (!Number.isInteger(identifiant) || identifiant <= 0) {
      return apiError(400, "VALIDATION", "L'identifiant du combat est invalide.");
    }

    const combat = await getFightById(identifiant);

    if (!combat) {
      return apiError(404, "INTROUVABLE", `Aucun combat numéro ${identifiant}.`);
    }

    return Response.json({ combat });
  } catch (error) {
    return handleApiError(error);
  }
}
