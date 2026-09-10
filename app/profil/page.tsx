import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfilView } from "@/app/profil/profil-view";
import { getCurrentPlayerId } from "@/lib/auth";
import { getAllObjects } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Profil",
  description:
    "Votre profil Object Battle : points, victoires, taux de réussite, position au classement et derniers combats.",
};

export default async function ProfilPage() {
  // Page réservée aux joueurs connectés.
  if ((await getCurrentPlayerId()) === null) {
    redirect("/connexion");
  }

  // Le solde, le palmarès et l'historique viennent du store de jeu, amorcé par
  // le layout. Seul le catalogue d'objets est chargé ici.
  const objets = await getAllObjects();

  return <ProfilView objets={objets} />;
}
