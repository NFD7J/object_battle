import type { Metadata } from "next";
import Link from "next/link";

import { ObjectCard } from "@/components/object-card";
import { PageHeader, btn, btnLabel } from "@/components/ui";
import { getAllObjects } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Objets",
  description:
    "Tous les objets disponibles dans Object Battle : image, statistiques, score global et fiche détaillée pour chaque combattant.",
};

export default async function ObjetsPage() {
  // Composant serveur : la requête part directement vers PostgreSQL, sans
  // passer par /api/objets. Rien de tout ceci n'atteint le navigateur.
  const combatants = await getAllObjects();

  return (
    <>
      <PageHeader
        eyebrow="Roster"
        title="Les objets"
        subtitle={`${combatants.length} combattants sont prêts à en découdre. Consultez leurs statistiques, ouvrez leur fiche, ou ajoutez le vôtre.`}
        action={
          <Link href="/objets/nouveau" className={`${btn.base} ${btn.secondary}`}>
            <span className={btnLabel}>
              <span aria-hidden="true">+</span> Ajouter un objet
            </span>
          </Link>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="sr-only">Liste des objets</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {combatants.map((combatant, index) => (
            <li key={combatant.id}>
              <ObjectCard combatant={combatant} priority={index < 3} />
            </li>
          ))}
        </ul>

        {/* Invitation à compléter le roster */}
        <div className="mt-10 border border-dashed border-edge bg-panel/50 px-6 py-10 text-center">
          <h2 className="text-2xl text-white">Un objet vous manque ?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/60">
            Ajoutez son nom, son image et ses quatre caractéristiques : il
            rejoindra l&apos;arène et pourra être sélectionné en combat.
          </p>
          <Link
            href="/objets/nouveau"
            className={`${btn.base} ${btn.primary} mt-6`}
          >
            <span className={btnLabel}>Créer un objet</span>
          </Link>
        </div>
      </div>
    </>
  );
}
