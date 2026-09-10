import { enCote } from "@/lib/fight-engine";
import type { Cotes } from "@/lib/fight-engine";
import type { Object } from "@/lib/types";

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
  puissance: 1.20,
  resistance: 1.10,
  rapidite: 1.05,
  intelligence: 1.15,
  aleatoire: 1.50,
} as const;

export type FightOutcome = {
  scoreA: number;
  scoreB: number;
  /** null en cas de match nul. */
  winnerId: number | null;
};

/** Score d'un objet sur ce combat : 0 à 100, arrondi. */
function scoreDe(combatant: Object): number {
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
export function resolveFight(a: Object, b: Object): FightOutcome {
  const scoreA = scoreDe(a);
  const scoreB = scoreDe(b);

  return {
    scoreA,
    scoreB,
    winnerId: (scoreA < scoreB + 5 && scoreA > scoreB - 5) ? null : scoreA > scoreB ? a.id : b.id,
  };
}

/* ===========================================================================
   Cotes par simulation (méthode de Monte-Carlo)

   Plutôt que de deviner la force d'un objet par une formule, on fait
   simplement combattre la paire NB_SIMULATIONS fois à blanc et on compte les
   résultats. La fréquence observée sert de probabilité, convertie en cote par
   enCote() — la marge de la maison et les bornes vivent dans fight-engine.ts.

   L'avantage : les cotes suivent automatiquement le moteur. Si resolveFight
   change (pondérations, fenêtre du match nul), les cotes suivent sans qu'on
   ait à retoucher une formule en parallèle.

   Le coût : 500 combats par paire, soit ~1000 appels à Math.random(). C'est
   négligeable une fois, mais assez pour ne pas vouloir le refaire à chaque
   affichage — d'où l'enregistrement en base (voir getPairOdds dans
   lib/queries.ts).
   =========================================================================== */

/** Nombre de combats joués à blanc pour estimer les probabilités d'une paire. */
export const NB_SIMULATIONS = 500;

/** Résultat brut d'une campagne de simulation, cotes et comptages. */
export type SimulationPaire = {
  cotes: Cotes;
  /** Nombre de simulations remportées par le premier objet. */
  victoiresA: number;
  victoiresB: number;
  nuls: number;
  nbSimulations: number;
};

/**
 * Estime les cotes d'une paire en rejouant son combat NB_SIMULATIONS fois.
 *
 * Les trois cotes ne dépendent pas de l'ordre des arguments : scoreDe() note
 * chaque objet isolément, sans savoir qui est en face. C'est ce qui permet de
 * n'enregistrer qu'une ligne par paire, quel que soit le sens.
 */
export function simulerCotes(a: Object, b: Object): SimulationPaire {
  let victoiresA = 0;
  let victoiresB = 0;
  let nuls = 0;

  for (let i = 0; i < NB_SIMULATIONS; i += 1) {
    const { winnerId } = resolveFight(a, b);

    if (winnerId === null) nuls += 1;
    else if (winnerId === a.id) victoiresA += 1;
    else victoiresB += 1;
  }

  return {
    cotes: {
      A: enCote(victoiresA / NB_SIMULATIONS),
      B: enCote(victoiresB / NB_SIMULATIONS),
      nul: enCote(nuls / NB_SIMULATIONS),
    },
    victoiresA,
    victoiresB,
    nuls,
    nbSimulations: NB_SIMULATIONS,
  };
}

/**
 * Points gagnés (positif) ou perdus (négatif) selon le pari.
 *
 * La cote est celle enregistrée en base au moment du pari, pas une constante :
 * un pari sur l'outsider rapporte davantage qu'un pari sur le favori.
 *
 * @param betOnId objet sur lequel le joueur a misé, ou null pour le match nul
 * @param winnerId vainqueur du combat, ou null pour un match nul
 * @param amount mise engagée
 * @param cote multiplicateur de la mise si le pari passe
 */
export function computeBetDelta(
  betOnId: number | null,
  winnerId: number | null,
  amount: number,
  cote: number,
): number {
  const pariGagnant = betOnId === winnerId;

  // bet_delta est une colonne entière : la cote a deux décimales, on arrondit.
  return pariGagnant ? Math.round(amount * cote) : -amount;
}
