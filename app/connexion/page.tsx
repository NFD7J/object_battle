import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { PageHeader } from "@/components/ui";
import { getCurrentPlayerId } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Connexion",
  description:
    "Connectez-vous à Object Battle pour retrouver vos points, votre historique de combats et votre place au classement.",
};

export default async function ConnexionPage() {
  if ((await getCurrentPlayerId()) !== null) {
    redirect("/profil");
  }

  return (
    <>
      <PageHeader
        eyebrow="Retour au ring"
        title="Connexion"
        subtitle="Retrouvez vos points, votre historique et votre place au classement."
      />

      <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <AuthForm mode="connexion" />
      </div>
    </>
  );
}
