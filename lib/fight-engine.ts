/**
 * Vocabulaire et arithmétique des cotes, partagés par le serveur et l'écran.
 *
 * Ce module ne décide rien : il ne résout aucun combat et n'estime aucune
 * probabilité. Il tient les types (Issue, Cotes), la conversion d'une
 * probabilité en cote payable, et l'affichage.
 *
 * L'issue d'un combat est calculée par resolveFight (lib/combat.ts), et les
 * probabilités de chaque issue par simulerCotes, qui rejoue la paire 500 fois.
 * Ces deux fonctions vivent côté serveur uniquement : ce fichier-ci est
 * importable par un composant client, ce qui interdit d'y mettre quoi que ce
 * soit dont le joueur ne doive pas connaître le détail.
 */

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

/** Plancher des cotes, pour qu'un pari sur le grand favori rapporte un minimum. */
const COTE_MIN = 1.15;

/**
 * Plafond des cotes.
 *
 * Une issue jamais sortie sur 500 simulations donne une probabilité de 0, donc
 * une cote infinie. Le plafond borne ce cas — et évite au passage qu'un pari à
 * 100 points sur l'impossible rapporte un solde à six chiffres.
 */
const COTE_MAX = 25;

/**
 * Convertit une probabilité en cote affichable (2 décimales).
 *
 * Exporté car c'est la seule conversion probabilité → cote du projet : les
 * cotes simulées de lib/combat.ts passent par ici, pour que la marge et les
 * bornes soient définies à un seul endroit.
 */
export function enCote(probabilite: number): number {
  if (probabilite <= 0) return COTE_MAX;

  const cote = 1 / probabilite;
  return Math.min(COTE_MAX, Math.max(COTE_MIN, Math.round(cote * 100) / 100));
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
