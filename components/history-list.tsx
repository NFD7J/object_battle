"use client";

import { useState } from "react";

import { FightRow } from "@/components/fight-row";
import { Panel } from "@/components/ui";
import { useGame } from "@/lib/game-store";

type Filtre = "tous" | "gain" | "perte";

const FILTRES: { key: Filtre; label: string }[] = [
  { key: "tous", label: "Tous les combats" },
  { key: "gain", label: "Paris gagnés" },
  { key: "perte", label: "Paris perdus" },
];

/** Résumé chiffré de l'historique, branché sur le solde live. */
export function HistoriqueResume({ fights: fightsProp }: { fights?: Fight[] } = {}) {
  const { fights: fightsStore } = useGame();
  const fights = fightsProp ?? fightsStore;
  const nbGains = fights.filter((fight) => fight.bet.outcome === "gain").length;
  const nbPertes = fights.filter((fight) => fight.bet.outcome === "perte").length;

  return (
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
  );
}

/** Liste filtrable de l'historique des combats (§4.5). */
export function HistoryList({
  compact = false,
  limit,
  combatantId,
  filtres = true,
  emptyTitle = "Aucun combat ici",
  emptyText = "Changez de filtre ou lancez un nouveau combat.",
  fights: fightsProp,
}: {
  compact?: boolean;
  limit?: number;
  combatantId?: number;
  filtres?: boolean;
  emptyTitle?: string;
  emptyText?: string;
  fights?: Fight[];
}) {
  const { fights: fightsStore } = useGame();
  const fights = fightsProp ?? fightsStore;
  const [filtre, setFiltre] = useState<Filtre>("tous");

  let liste = fights;
  if (combatantId != null) {
    liste = liste.filter(
      (fight) => fight.fighterA.id === combatantId || fight.fighterB.id === combatantId,
    );
  }
  if (filtre !== "tous") {
    liste = liste.filter((fight) => fight.bet.outcome === filtre);
  }
  if (limit != null) {
    liste = liste.slice(0, limit);
  }

  return (
    <div>
      {filtres ? (
        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filtrer l'historique">
          {FILTRES.map((option) => {
            const actif = filtre === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setFiltre(option.key)}
                aria-pressed={actif}
                className={`tag-slant px-4 py-2 font-mono text-xs tracking-[0.14em] uppercase transition-colors ${
                  actif
                    ? "bg-linear-to-r from-arcade-violet to-arcade-blue font-bold text-white"
                    : "bg-panel text-white/60 hover:bg-panel-soft hover:text-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {liste.length} combats affichés.
      </p>

      {liste.length > 0 ? (
        <ul className="grid gap-3">
          {liste.map((fight) => (
            <li key={fight.id}>
              <FightRow fight={fight} compact={compact} />
            </li>
          ))}
        </ul>
      ) : (
        <Panel innerClassName="p-10 text-center">
          <p className="font-display text-2xl text-white/60">{emptyTitle}</p>
          <p className="mt-2 text-sm text-white/50">{emptyText}</p>
        </Panel>
      )}
    </div>
  );
}
