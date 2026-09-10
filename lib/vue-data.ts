import "server-only";

import { getAllObjects, getFightsByPlayer, getRanking } from "@/lib/queries";
import type { DonneesCompte, Player } from "@/lib/types";

export type { DonneesCompte };

/** Classement réel, visible par tout le monde. */
export async function chargerClassement(): Promise<Player[]> {
  return getRanking("points", 50);
}

/** Objets, classement et historique du joueur, lus en parallèle. */
export async function chargerDonneesCompte(playerId: number): Promise<DonneesCompte> {
  const [objets, joueurs, combats] = await Promise.all([
    getAllObjects(),
    getRanking("points", 50),
    getFightsByPlayer(playerId, 50),
  ]);

  return { objets, joueurs, combats };
}
