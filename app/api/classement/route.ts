import { apiError, handleApiError, readIntParam } from "@/lib/api";
import { getRanking } from "@/lib/queries";
import type { RankingSort } from "@/lib/types";

const TRIS_AUTORISES: RankingSort[] = ["points", "victoires", "ratio"];

/**
 * GET /api/classement
 * Classement des joueurs (§4.4).
 *
 * Paramètres facultatifs :
 *   ?tri=points|victoires|ratio
 *   ?limit=50
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const limit = readIntParam(request, "limit", 50);
    const tri = new URL(request.url).searchParams.get("tri") ?? "points";

    // Le tri est comparé à une liste fermée avant d'atteindre la couche SQL.
    if (!TRIS_AUTORISES.includes(tri as RankingSort)) {
      return apiError(
        400,
        "TRI_INVALIDE",
        `Tri « ${tri} » inconnu. Valeurs acceptées : ${TRIS_AUTORISES.join(", ")}.`,
      );
    }

    const joueurs = await getRanking(tri as RankingSort, limit);

    return Response.json({ tri, joueurs });
  } catch (error) {
    return handleApiError(error);
  }
}
