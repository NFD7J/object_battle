import type { Metadata } from "next";

import { ObjectForm } from "@/app/objets/nouveau/object-form";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Créer un objet",
  description:
    "Ajoutez un objet à Object Battle : nom, description, image et quatre caractéristiques de combat notées de 0 à 100.",
};

export default function NouvelObjetPage() {
  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Créer un objet"
        subtitle="Donnez-lui un nom, une image et ses quatre caractéristiques. L'aperçu se met à jour au fur et à mesure."
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <ObjectForm />
      </div>
    </>
  );
}
