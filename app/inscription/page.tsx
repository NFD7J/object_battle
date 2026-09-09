import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { PageHeader } from "@/components/ui";
import { getCurrentPlayerId } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Inscription",
  description:
    "Créez votre compte Object Battle pour miser des points, lancer des combats et grimper dans le classement.",
};

export default async function InscriptionPage() {
  // Déjà connecté : inutile de proposer une inscription.
  if ((await getCurrentPlayerId()) !== null) {
    redirect("/profil");
  }

  return (
    <>
      <PageHeader
        eyebrow="Nouveau joueur"
        title="Inscription"
        subtitle="Créez votre compte pour parier sur les combats et apparaître au classement. Vous démarrez avec 1 000 points."
      />

      <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <AuthForm mode="inscription" />
      </div>
    </>
  );
}
