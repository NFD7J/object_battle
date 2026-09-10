import { apiError, handleApiError, readIntParam, readJsonBody } from "@/lib/api";
import { getCurrentPlayerId } from "@/lib/auth";
import { computeBetDelta, resolveFight } from "@/lib/combat";
import { ValidationError } from "@/lib/db";
import {
  createFight,
  getFightsByObject,
  getObjectById,
  getObjectBySlug,
  getPairOdds,
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
 *   "betOn": 1,        // facultatif : identifiant d'un des deux objets, ou "nul"
 *   "amount": 25       // facultatif : mise en points
 * }
 *
 * Tout le monde peut lancer un combat, connecté ou non, et tous les combats
 * sont enregistrés : l'historique est le même pour tous. Le pari, lui, est
 * réservé aux comptes — c'est la seule différence entre un visiteur et un
 * joueur inscrit. Un combat sans « betOn »/« amount » est enregistré sans mise.
 *
 * Le client choisit les combattants, la mise et le pari — rien de plus. Les
 * scores, le vainqueur et le gain sont calculés ici : les recevoir du
 * navigateur reviendrait à laisser le joueur décider s'il gagne (§16).
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);

    // L'identifiant du joueur vient de la session, jamais du corps de la
    // requête. null = visiteur : le combat aura lieu, mais sans pari.
    const playerId = await getCurrentPlayerId();

    const { object1Id, object2Id, betOn, amount } = body;

    if (!Number.isInteger(object1Id) || !Number.isInteger(object2Id)) {
      throw new ValidationError("object1Id et object2Id doivent être des entiers.");
    }

    if (object1Id === object2Id) {
      throw new ValidationError("Un objet ne peut pas s'affronter lui-même.");
    }

    // Un pari est engagé dès qu'un des deux champs est renseigné. Les exiger
    // ensemble évite d'enregistrer une mise sans camp, ou l'inverse.
    const parie = betOn !== undefined || (amount !== undefined && amount !== null);

    if (parie && playerId === null) {
      return apiError(
        401,
        "NON_AUTHENTIFIE",
        "Connectez-vous pour miser des points sur un combat.",
      );
    }

    if (parie && betOn === undefined) {
      throw new ValidationError("Précisez le camp sur lequel porte la mise.");
    }

    if (parie && (!Number.isInteger(amount) || (amount as number) <= 0)) {
      throw new ValidationError("La mise doit être un entier strictement positif.");
    }

    // « nul » ou l'identifiant d'un des deux combattants, rien d'autre.
    if (parie && betOn !== "nul" && betOn !== object1Id && betOn !== object2Id) {
      throw new ValidationError(
        "Le pari doit porter sur l'un des deux objets, ou valoir « nul ».",
      );
    }

    const mise = parie ? (amount as number) : 0;
    const betOnId = parie && betOn !== "nul" ? (betOn as number) : null;

    const [objetA, objetB, joueur] = await Promise.all([
      getObjectById(object1Id as number),
      getObjectById(object2Id as number),
      playerId === null ? null : getPlayerById(playerId),
    ]);

    if (!objetA || !objetB) {
      return apiError(404, "INTROUVABLE", "L'un des deux objets n'existe pas.");
    }

    if (playerId !== null && !joueur) {
      // Session valide mais compte disparu depuis.
      return apiError(401, "NON_AUTHENTIFIE", "Ce compte n'existe plus.");
    }

    // On ne peut pas miser plus de points qu'on n'en possède.
    if (joueur && mise > joueur.points) {
      throw new ValidationError(
        `Mise de ${mise} points impossible : vous en avez ${joueur.points}.`,
      );
    }

    // Cotes de la paire, simulées à sa première rencontre puis relues en base.
    // C'est la ligne que GET /api/cotes a déjà servie au navigateur avant le
    // pari : le joueur est payé exactement à la cote qu'on lui a annoncée.
    // Un combat sans pari passe par ici lui aussi, pour que toute paire jouée
    // finisse enregistrée.
    const cotes = await getPairOdds(objetA.id, objetB.id);

    // Cote de l'issue choisie. « A » désigne object1Id, « B » object2Id.
    const coteDuPari = !parie
      ? 0
      : betOnId === null
        ? cotes.nul
        : betOnId === objetA.id
          ? cotes.A
          : cotes.B;

    const resultat = resolveFight(objetA, objetB);
    const delta = parie
      ? computeBetDelta(betOnId, resultat.winnerId, mise, coteDuPari)
      : 0;

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
      betCote: coteDuPari,
    });

    return Response.json(
      { combat, joueur: playerId === null ? null : await getPlayerByIdFresh(playerId) },
      { status: 201, headers: { Location: `/api/combats/${combat.id}` } },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
