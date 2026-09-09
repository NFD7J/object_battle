/**
 * Moteur de combat et calcul des cotes.
 *
 * Deux principes indépendants :
 * 1. L'issue d'un combat est TOTALEMENT aléatoire. Les stats et le score
 *    global d'un objet n'influencent en rien le vainqueur : le favori peut
 *    tomber face au dernier du classement.
 * 2. Les cotes, elles, sont calculées à partir des stats et du palmarès, à la
 *    manière d'un bookmaker. Miser sur l'outsider rapporte donc davantage.
 */

import type { Combatant } from "@/lib/types";

/** Camp désigné par un pari ou par le résultat d'un combat. */
export type Issue = "A" | "B" | "nul";

/** Cote (multiplicateur de la mise) pour chacune des trois issues. */
export type Cotes = Record<Issue, number>;

/** Résultat d'un combat résolu : le vainqueur et les PV restants de chacun. */
export type ResultatCombat = {
  vainqueur: Issue;
  pvA: number;
  pvB: number;
};

/** Points de vie de départ, identiques pour tous les objets. */
export const PV_MAX = 100;

/** Probabilité d'un match nul, identique pour tous les affrontements. */
const PROBA_NUL = 0.08;

/** Marge de la maison : les cotes sont légèrement inférieures aux cotes pures. */
const MARGE = 1.08;

/** Plancher des cotes, pour qu'un pari sur le grand favori rapporte un minimum. */
const COTE_MIN = 1.15;

/** Accentue l'écart de cote entre deux objets de niveaux différents. */
const EXPOSANT = 2.2;

/** Entier aléatoire dans l'intervalle [min, max] inclus. */
function entierAleatoire(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Résout un combat. Aucun argument : le vainqueur ne dépend d'aucun objet,
 * seulement du hasard. Les deux combattants partent de `PV_MAX` ; le perdant
 * finit à 0 PV et le vainqueur conserve un reliquat tiré au sort.
 */
export function resoudreCombat(): ResultatCombat {
  const tirage = Math.random();

  // Double K.O. : les deux objets tombent en même temps.
  if (tirage < PROBA_NUL) {
    return { vainqueur: "nul", pvA: 0, pvB: 0 };
  }

  const pvRestants = entierAleatoire(6, 68);
  const vainqueur: Issue = tirage < PROBA_NUL + (1 - PROBA_NUL) / 2 ? "A" : "B";

  return vainqueur === "A"
    ? { vainqueur, pvA: pvRestants, pvB: 0 }
    : { vainqueur, pvA: 0, pvB: pvRestants };
}

/** Niveau estimé d'un objet : score global pondéré par son ratio de victoires. */
function force(combatant: Combatant): number {
  const combats = combatant.nbWins + combatant.nbLosses;
  const ratio = combats > 0 ? combatant.nbWins / combats : 0.5;
  return combatant.overall * (0.85 + 0.3 * ratio);
}

/** Convertit une probabilité en cote affichable (2 décimales). */
function enCote(probabilite: number): number {
  const cote = 1 / probabilite / MARGE;
  return Math.max(COTE_MIN, Math.round(cote * 100) / 100);
}

/**
 * Cotes du match. Plus un objet paraît fort, plus sa cote est basse.
 * Tant que les deux combattants ne sont pas choisis, on renvoie `null`.
 */
export function calculerCotes(
  fighterA: Combatant | null,
  fighterB: Combatant | null,
): Cotes | null {
  if (!fighterA || !fighterB) return null;

  const forceA = force(fighterA) ** EXPOSANT;
  const forceB = force(fighterB) ** EXPOSANT;
  const total = forceA + forceB;

  return {
    A: enCote(((1 - PROBA_NUL) * forceA) / total),
    B: enCote(((1 - PROBA_NUL) * forceB) / total),
    nul: enCote(PROBA_NUL),
  };
}

/** Points remportés si le pari passe (mise × cote, arrondi à l'entier). */
export function gainPotentiel(mise: number, cote: number): number {
  return Math.round(mise * cote);
}

/** Variation de solde : +mise×cote si le pari passe, −mise sinon. */
export function deltaParis(mise: number, cote: number, pariGagnant: boolean): number {
  return pariGagnant ? gainPotentiel(mise, cote) : -mise;
}

/** Affichage français d'une cote : « 2.40 » devient « 2,40 ». */
export function formatCote(cote: number): string {
  return cote.toFixed(2).replace(".", ",");
}
