import { apiError, handleApiError } from "@/lib/api";
import { ValidationError } from "@/lib/db";
import { NB_SIMULATIONS } from "@/lib/combat";
import { getPairOdds } from "@/lib/queries";

/**
 * GET /api/cotes?a=1&b=4
 * Cotes des trois issues pour une paire d'objets (§4.2).
 *
 * Réponse : { cotes: { A: 1.62, B: 2.45, nul: 8.12 }, nbSimulations: 500 }
 * où « A » correspond à l'objet passé en `a`, et « B » à celui passé en `b`.
 *
 * À la première demande pour une paire, les cotes sont obtenues en simulant
 * 500 combats, puis enregistrées : les appels suivants ne font qu'une lecture.
 * C'est aussi cette ligne que POST /api/combats relit pour payer le pari — le
 * joueur est donc toujours payé à la cote qu'on lui a affichée.
 *
 * Aucune authentification : une cote est une information publique, identique
 * pour tous. Un visiteur peut la consulter même s'il ne peut pas parier.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const params = new URL(request.url).searchParams;

    const a = Number(params.get("a"));
    const b = Number(params.get("b"));

    if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) {
      throw new ValidationError(
        "Les paramètres « a » et « b » doivent être des identifiants d'objets.",
      );
    }

    if (a === b) {
      throw new ValidationError("Un objet ne peut pas s'affronter lui-même.");
    }

    return Response.json({
      cotes: await getPairOdds(a, b),
      nbSimulations: NB_SIMULATIONS,
    });
  } catch (error) {
    // getPairOdds lève une ValidationError si un objet manque : à ce niveau
    // c'est une ressource absente, pas une requête mal formée.
    if (error instanceof ValidationError && error.message.includes("n'existe pas")) {
      return apiError(404, "INTROUVABLE", error.message);
    }

    return handleApiError(error);
  }
}
