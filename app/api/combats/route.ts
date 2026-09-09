import { apiError, handleApiError, readIntParam, readJsonBody } from "@/lib/api";
import { getCurrentPlayerId } from "@/lib/auth";
import { computeBetDelta, resolveFight } from "@/lib/combat";
import { ValidationError } from "@/lib/db";
import {
  createFight,
  getFightsByObject,
  getObjectById,
  getObjectBySlug,
  getPlayerById,
  getPlayerByIdFresh,
  getRecentFights,
} from "@/lib/queries";

/**
 * GET /api/combats
 * Historique des combats (§4.5).
 *
 * Paramètres facultatifs :
 *   ?limit=20      nombre de combats renvoyés
 *   ?objet=marteau ne garde que les combats d'un objet donné
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const limit = readIntParam(request, "limit", 20);
    const slug = new URL(request.url).searchParams.get("objet");

    if (slug) {
      const objet = await getObjectBySlug(slug);

      if (!objet) {
        return apiError(404, "INTROUVABLE", `Aucun objet ne correspond à « ${slug} ».`);
      }

      return Response.json({ combats: await getFightsByObject(objet.id, limit) });
    }

    return Response.json({ combats: await getRecentFights(limit) });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/combats
 * Lance un combat, calcule le résultat et l'enregistre (§4.2).
 *
 * Corps attendu :
 * {
 *   "object1Id": 1,
 *   "object2Id": 4,
 *   "betOn": 1,        // identifiant d'un des deux objets, ou "nul"
 *   "amount": 25       // mise en points
 * }
 *
 * Le client choisit les combattants, la mise et le pari — rien de plus. Les
 * scores, le vainqueur et le gain sont calculés ici : les recevoir du
 * navigateur reviendrait à laisser le joueur décider s'il gagne (§16).
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);

    // L'identifiant du joueur vient de la session, jamais du corps de la requête.
    const playerId = await getCurrentPlayerId();

    if (playerId === null) {
      return apiError(
        401,
        "NON_AUTHENTIFIE",
        "Connectez-vous pour lancer un combat et miser des points.",
      );
    }

    const { object1Id, object2Id, betOn, amount } = body;

    if (!Number.isInteger(object1Id) || !Number.isInteger(object2Id)) {
      throw new ValidationError("object1Id et object2Id doivent être des entiers.");
    }

    if (object1Id === object2Id) {
      throw new ValidationError("Un objet ne peut pas s'affronter lui-même.");
    }

    if (!Number.isInteger(amount) || (amount as number) <= 0) {
      throw new ValidationError("La mise doit être un entier strictement positif.");
    }

    const mise = amount as number;

    // « nul » ou l'identifiant d'un des deux combattants, rien d'autre.
    if (betOn !== "nul" && betOn !== object1Id && betOn !== object2Id) {
      throw new ValidationError(
        "Le pari doit porter sur l'un des deux objets, ou valoir « nul ».",
      );
    }

    const betOnId = betOn === "nul" ? null : (betOn as number);

    const [objetA, objetB, joueur] = await Promise.all([
      getObjectById(object1Id as number),
      getObjectById(object2Id as number),
      getPlayerById(playerId),
    ]);

    if (!objetA || !objetB) {
      return apiError(404, "INTROUVABLE", "L'un des deux objets n'existe pas.");
    }

    if (!joueur) {
      // Session valide mais compte disparu depuis.
      return apiError(401, "NON_AUTHENTIFIE", "Ce compte n'existe plus.");
    }

    // On ne peut pas miser plus de points qu'on n'en possède.
    if (mise > joueur.points) {
      throw new ValidationError(
        `Mise de ${mise} points impossible : vous en avez ${joueur.points}.`,
      );
    }

    const resultat = resolveFight(objetA, objetB);
    const delta = computeBetDelta(betOnId, resultat.winnerId, mise);

    const combat = await createFight({
      userId: playerId,
      object1Id: objetA.id,
      object2Id: objetB.id,
      winnerId: resultat.winnerId,
      score1: resultat.scoreA,
      score2: resultat.scoreB,
      betOnId,
      betAmount: mise,
      betDelta: delta,
    });

    return Response.json(
      { combat, joueur: await getPlayerByIdFresh(playerId) },
      { status: 201, headers: { Location: `/api/combats/${combat.id}` } },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
