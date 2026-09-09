import type { Combatant } from "@/lib/types";

/* ===========================================================================
   Moteur de combat (§9)

   Le score mélange les caractéristiques de l'objet et une part d'aléatoire,
   pour qu'un objet faible sur le papier puisse malgré tout l'emporter.

   Ce calcul tourne UNIQUEMENT sur le serveur, appelé depuis POST /api/combats.
   Si le navigateur pouvait envoyer les scores, n'importe qui gagnerait tous
   ses paris en modifiant la requête (§16).

   Adaptation de la formule du §9 : le cahier des charges pondère « dégâts »
   (12 %) et « endurance » (5 %), deux caractéristiques absentes de la liste
   officielle du §8. Les 12 % sont repris par l'intelligence, et les 5 %
   restants versés à l'aléatoire. Le total fait toujours 100 %.
   =========================================================================== */

export const PONDERATIONS = {
  puissance: 0.15,
  resistance: 0.1,
  rapidite: 0.08,
  intelligence: 0.12,
  aleatoire: 0.55,
} as const;

/** Multiplicateur de gain quand on a parié sur le bon objet. */
export const COTE_OBJET = 2;

/** Multiplicateur de gain sur un match nul, plus rare donc mieux payé. */
export const COTE_NUL = 3;

export type FightOutcome = {
  scoreA: number;
  scoreB: number;
  /** null en cas de match nul. */
  winnerId: number | null;
};

/** Score d'un objet sur ce combat : 0 à 100, arrondi. */
function scoreDe(combatant: Combatant): number {
  const { puissance, resistance, rapidite, intelligence } = combatant.stats;
  const aleatoire = Math.random() * 100;

  const score =
    puissance * PONDERATIONS.puissance +
    resistance * PONDERATIONS.resistance +
    rapidite * PONDERATIONS.rapidite +
    intelligence * PONDERATIONS.intelligence +
    aleatoire * PONDERATIONS.aleatoire;

  return Math.round(score);
}

/** Fait s'affronter deux objets et désigne le vainqueur. */
export function resolveFight(a: Combatant, b: Combatant): FightOutcome {
  const scoreA = scoreDe(a);
  const scoreB = scoreDe(b);

  return {
    scoreA,
    scoreB,
    winnerId: scoreA === scoreB ? null : scoreA > scoreB ? a.id : b.id,
  };
}

/**
 * Points gagnés (positif) ou perdus (négatif) selon le pari.
 *
 * @param betOnId objet sur lequel le joueur a misé, ou null pour le match nul
 * @param winnerId vainqueur du combat, ou null pour un match nul
 * @param amount mise engagée
 */
export function computeBetDelta(
  betOnId: number | null,
  winnerId: number | null,
  amount: number,
): number {
  const pariGagnant = betOnId === winnerId;

  if (!pariGagnant) return -amount;

  return winnerId === null ? amount * COTE_NUL : amount * COTE_OBJET;
}
