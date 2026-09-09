/**
 * DONNÉES DE DÉMONSTRATION — À SUPPRIMER
 * =====================================
 * Ce fichier n'existe que pour habiller les maquettes tant que la base
 * PostgreSQL (Neon) et l'API REST ne sont pas branchées.
 *
 * Rien ici n'est calculé : les scores, classements et gains sont écrits en dur.
 * Le moteur de combat (§9) et les requêtes SQL (§10) viendront plus tard et
 * remplaceront ces constantes, sans toucher aux composants d'affichage.
 */

import type { Combatant, Fight, Player } from "@/lib/types";

export const combatants: Combatant[] = [
  {
    id: 1,
    slug: "marteau",
    name: "Marteau",
    description:
      "Ne discute pas, ne négocie pas. Frappe d'abord, frappe encore, puis rentre à la boîte à outils.",
    image: "/objets/marteau.svg",
    stats: { puissance: 90, resistance: 75, rapidite: 50, intelligence: 70 },
    overall: 78,
    nbWins: 24,
    nbLosses: 6,
  },
  {
    id: 2,
    slug: "poele",
    name: "Poêle",
    description:
      "Chauffe vite, encaisse tout, et sort toujours du placard au pire moment pour l'adversaire.",
    image: "/objets/poele.svg",
    stats: { puissance: 78, resistance: 88, rapidite: 42, intelligence: 55 },
    overall: 74,
    nbWins: 19,
    nbLosses: 9,
  },
  {
    id: 3,
    slug: "chaise",
    name: "Chaise",
    description:
      "Quatre pieds, zéro pitié. Spécialiste incontestée du combat de saloon.",
    image: "/objets/chaise.svg",
    stats: { puissance: 72, resistance: 66, rapidite: 38, intelligence: 44 },
    overall: 64,
    nbWins: 12,
    nbLosses: 15,
  },
  {
    id: 4,
    slug: "bouteille",
    name: "Bouteille",
    description:
      "Fragile mais rusée. Elle mise tout sur la vitesse et sur l'effet de surprise.",
    image: "/objets/bouteille.svg",
    stats: { puissance: 35, resistance: 60, rapidite: 70, intelligence: 90 },
    overall: 61,
    nbWins: 14,
    nbLosses: 13,
  },
  {
    id: 5,
    slug: "parapluie",
    name: "Parapluie",
    description:
      "Bouclier le jour, épée la nuit. Le seul combattant qui gère aussi la météo.",
    image: "/objets/parapluie.svg",
    stats: { puissance: 52, resistance: 71, rapidite: 64, intelligence: 68 },
    overall: 66,
    nbWins: 17,
    nbLosses: 11,
  },
  {
    id: 6,
    slug: "clavier",
    name: "Clavier",
    description:
      "104 touches, 104 façons de vous contredire. Redoutable en combat verbal.",
    image: "/objets/clavier.svg",
    stats: { puissance: 40, resistance: 45, rapidite: 82, intelligence: 95 },
    overall: 68,
    nbWins: 21,
    nbLosses: 8,
  },
  {
    id: 7,
    slug: "cafetiere",
    name: "Cafetière",
    description:
      "Lente au réveil, ingérable après le premier passage. Endurance quasi illimitée.",
    image: "/objets/cafetiere.svg",
    stats: { puissance: 66, resistance: 79, rapidite: 30, intelligence: 74 },
    overall: 67,
    nbWins: 15,
    nbLosses: 12,
  },
  {
    id: 8,
    slug: "grille-pain",
    name: "Grille-pain",
    description:
      "Attaque à distance avec projectiles brûlants. Imprévisible, comme sa minuterie.",
    image: "/objets/grille-pain.svg",
    stats: { puissance: 58, resistance: 52, rapidite: 76, intelligence: 33 },
    overall: 58,
    nbWins: 9,
    nbLosses: 18,
  },
];

/** Retrouve un combattant par son slug d'URL (`/objets/marteau`). */
export function getCombatantBySlug(slug: string): Combatant | undefined {
  return combatants.find((combatant) => combatant.slug === slug);
}

/** Raccourci de lecture pour construire les combats de démonstration. */
function byId(id: number): Combatant {
  const found = combatants.find((combatant) => combatant.id === id);
  if (!found) throw new Error(`Combattant ${id} introuvable dans les données de démo`);
  return found;
}

export const fights: Fight[] = [
  {
    id: 104,
    fighterA: byId(1),
    fighterB: byId(4),
    winnerId: 1,
    pvA: 42,
    pvB: 0,
    bet: { on: 1, amount: 25, cote: 1.5, outcome: "gain", delta: 38 },
    createdAt: "2026-09-08T20:14:00",
  },
  {
    id: 103,
    fighterA: byId(3),
    fighterB: byId(2),
    winnerId: 2,
    pvA: 0,
    pvB: 31,
    bet: { on: 3, amount: 20, cote: 2.62, outcome: "perte", delta: -20 },
    createdAt: "2026-09-08T19:02:00",
  },
  {
    id: 102,
    fighterA: byId(6),
    fighterB: byId(7),
    winnerId: null,
    pvA: 0,
    pvB: 0,
    bet: { on: "nul", amount: 15, cote: 11.57, outcome: "gain", delta: 174 },
    createdAt: "2026-09-07T18:41:00",
  },
  {
    id: 101,
    fighterA: byId(5),
    fighterB: byId(8),
    winnerId: 5,
    pvA: 55,
    pvB: 0,
    bet: { on: 8, amount: 30, cote: 2.61, outcome: "perte", delta: -30 },
    createdAt: "2026-09-07T17:26:00",
  },
  {
    id: 100,
    fighterA: byId(2),
    fighterB: byId(6),
    winnerId: 6,
    pvA: 0,
    pvB: 19,
    bet: { on: 6, amount: 40, cote: 2.18, outcome: "gain", delta: 87 },
    createdAt: "2026-09-06T21:10:00",
  },
];

export const players: Player[] = [
  { id: 1, username: "Noé", avatarColor: "#a855f7", points: 1870, maxPoints: 2140, nbVictoires: 87, nbCombats: 121, createdAt: "2026-01-12" },
  { id: 2, username: "Mathias", avatarColor: "#5b83ff", points: 1642, maxPoints: 1980, nbVictoires: 82, nbCombats: 130, createdAt: "2026-01-20" },
  { id: 3, username: "David", avatarColor: "#ff8a1f", points: 1408, maxPoints: 1512, nbVictoires: 76, nbCombats: 140, createdAt: "2026-02-02" },
  { id: 4, username: "Beatrice", avatarColor: "#22d3ee", points: 1195, maxPoints: 1310, nbVictoires: 64, nbCombats: 99, createdAt: "2026-02-14" },
  { id: 5, username: "Yanis", avatarColor: "#34d399", points: 1042, maxPoints: 1180, nbVictoires: 58, nbCombats: 112, createdAt: "2026-03-01" },
  { id: 6, username: "Lina", avatarColor: "#ffc53d", points: 930, maxPoints: 1024, nbVictoires: 51, nbCombats: 88, createdAt: "2026-03-18" },
  { id: 7, username: "Karim", avatarColor: "#ff5069", points: 814, maxPoints: 902, nbVictoires: 47, nbCombats: 105, createdAt: "2026-04-04" },
  { id: 8, username: "Sofia", avatarColor: "#c084fc", points: 702, maxPoints: 860, nbVictoires: 39, nbCombats: 94, createdAt: "2026-04-22" },
];

/** Joueur connecté simulé, en attendant l'authentification. */
export const currentPlayer: Player = players[0];

/**
 * Résultat de combat figé, uniquement pour montrer la mise en page de l'écran
 * de victoire. Le vrai calcul (§9) remplacera cet objet.
 */
export const mockResult = {
  fighterA: byId(1),
  fighterB: byId(4),
  pvA: 42,
  pvB: 0,
  winnerId: 1,
  bet: { amount: 25, cote: 1.5, delta: 38 },
};

/** Format d'affichage des dates : 08/09/2026 · 20:14 */
export function formatFightDate(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
