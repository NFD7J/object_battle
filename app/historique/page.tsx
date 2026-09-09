import type { Metadata } from "next";
import Link from "next/link";

import { HistoryList } from "@/components/history-list";
import { PageHeader, Panel, btn, btnLabel } from "@/components/ui";
import { fights } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Historique",
  description:
    "Retrouvez tous les combats précédents d'Object Battle : affiches, vainqueurs, scores, gains et pertes de points.",
};

export default function HistoriquePage() {
  const nbGains = fights.filter((fight) => fight.bet.outcome === "gain").length;
  const nbPertes = fights.filter((fight) => fight.bet.outcome === "perte").length;

  return (
    <>
      <PageHeader
        eyebrow="Archives"
        title="Historique"
        subtitle="Tous les combats déjà disputés, avec le vainqueur, les scores et le résultat de votre pari."
        action={
          <Link href="/combattre" className={`${btn.base} ${btn.primary}`}>
            <span className={btnLabel}>Nouveau combat</span>
          </Link>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {/* Résumé chiffré */}
        <dl className="mb-10 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Combats disputés", valeur: fights.length, couleur: "text-white" },
            { label: "Paris gagnés", valeur: nbGains, couleur: "text-victory" },
            { label: "Paris perdus", valeur: nbPertes, couleur: "text-defeat" },
          ].map((item) => (
            <div key={item.label}>
              <Panel innerClassName="p-5">
                <dt className="font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase">
                  {item.label}
                </dt>
                <dd className={`mt-1 font-display text-4xl leading-none tabular-nums ${item.couleur}`}>
                  {item.valeur}
                </dd>
              </Panel>
            </div>
          ))}
        </dl>

        <h2 className="sr-only">Liste des combats</h2>
        <HistoryList fights={fights} />
      </div>
    </>
  );
}
