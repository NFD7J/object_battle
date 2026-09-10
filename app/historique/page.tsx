import type { Metadata } from "next";
import Link from "next/link";

import { HistoryList, HistoriqueResume } from "@/components/history-list";
import { PageHeader, btn, btnLabel } from "@/components/ui";

export const metadata: Metadata = {
  title: "Historique",
  description:
    "Retrouvez tous les combats précédents d'Object Battle : affiches, vainqueurs, PV restants, cotes, gains et pertes de points.",
};

export default function HistoriquePage() {
  return (
    <>
      <PageHeader
        eyebrow="Archives"
        title="Historique"
        subtitle="Tous les combats déjà disputés, avec le vainqueur, les PV restants et le résultat de votre pari."
        action={
          <Link href="/combattre" className={`${btn.base} ${btn.primary}`}>
            <span className={btnLabel}>Nouveau combat</span>
          </Link>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <HistoriqueResume />
        <h2 className="sr-only">Liste des combats</h2>
        <HistoryList
          emptyTitle="Aucun combat pour le moment"
          emptyText="Choisissez deux objets et lancez votre premier round."
        />
      </div>
    </>
  );
}
