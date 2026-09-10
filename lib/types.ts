/**
 * Types du domaine Object Battle.
 *
 * Ils reprennent le vocabulaire du cahier des charges (§8, §10) afin que le
 * branchement futur sur PostgreSQL / l'API REST se fasse sans renommer l'UI.
 */

/** Les 4 caractéristiques d'un objet, chacune comprise entre 0 et 100 (§8). */
export type Stats = {
  puissance: number;
  resistance: number;
  rapidite: number;
  intelligence: number;
};

/** Clés de stats, utilisées pour afficher les jauges dans un ordre stable. */
export const STAT_KEYS = [
  "puissance",
  "resistance",
  "rapidite",
  "intelligence",
] as const satisfies readonly (keyof Stats)[];

/** Libellés affichés à l'écran pour chaque stat. */
export const STAT_LABELS: Record<keyof Stats, string> = {
  puissance: "Puissance",
  resistance: "Résistance",
  rapidite: "Rapidité",
  intelligence: "Intelligence",
};

/** Description courte de chaque stat (fiche objet, formulaire, aide). */
export const STAT_HINTS: Record<keyof Stats, string> = {
  puissance: "Force physique de l'objet",
  resistance: "Capacité à encaisser les dégâts",
  rapidite: "Vitesse de déplacement et d'action",
  intelligence: "Lucidité pendant le combat",
};

/** Un objet, c'est-à-dire une ligne de la table « objects ». */
export type Object = {
  id: number;
  slug: string;
  name: string;
  description: string;
  image: string;
  stats: Stats;
  /** Score global affiché sur la carte. Recalculé côté serveur plus tard. */
  overall: number;
  nbWins: number;
  nbLosses: number;
};

/** Issue d'un combat du point de vue du pari de l'utilisateur. */
export type BetOutcome = "gain" | "perte" | "nul";

/** Un combat passé, c'est-à-dire une ligne de la table « fights ». */
export type Fight = {
  id: number;
  fighterA: Object;
  fighterB: Object;
  /** `null` en cas de match nul (double K.O.). */
  winnerId: number | null;
  /** PV restants du combattant A à la fin (0 = K.O.). */
  pvA: number;
  /** PV restants du combattant B à la fin (0 = K.O.). */
  pvB: number;
  /** Points misés, cote retenue, puis gagnés (+) ou perdus (-) par l'utilisateur. */
  bet: {
    on: number | "nul";
    amount: number;
    cote: number;
    outcome: BetOutcome;
    delta: number;
  };
  createdAt: string;
};

/** Un joueur, c'est-à-dire une ligne de la table « users ». */
export type Player = {
  id: number;
  username: string;
  avatarColor: string;
  points: number;
  maxPoints: number;
  nbVictoires: number;
  nbCombats: number;
  createdAt: string;
};

/** Critères de tri du classement (§4.4). */
export type RankingSort = "points" | "victoires" | "ratio";

/** Données réelles chargées pour un joueur connecté. */
export type DonneesCompte = {
  objets: Object[];
  joueurs: Player[];
  combats: Fight[];
};
