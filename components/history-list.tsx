"use client";

import { useState } from "react";

import { FightRow } from "@/components/fight-row";
import { Panel } from "@/components/ui";
import type { Fight } from "@/lib/types";

type Filtre = "tous" | "gain" | "perte";

const FILTRES: { key: Filtre; label: string }[] = [
  { key: "tous", label: "Tous les combats" },
  { key: "gain", label: "Paris gagnés" },
  { key: "perte", label: "Paris perdus" },
];

/** Liste filtrable de l'historique des combats (§4.5). */
export function HistoryList({ fights }: { fights: Fight[] }) {
  const [filtre, setFiltre] = useState<Filtre>("tous");

  const listeFiltree =
    filtre === "tous"
      ? fights
      : fights.filter((fight) => fight.bet.outcome === filtre);

  return (
    <div>
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

      <p className="sr-only" aria-live="polite">
        {listeFiltree.length} combats affichés.
      </p>

      {listeFiltree.length > 0 ? (
        <ul className="grid gap-3">
          {listeFiltree.map((fight) => (
            <li key={fight.id}>
              <FightRow fight={fight} />
            </li>
          ))}
        </ul>
      ) : (
        <Panel innerClassName="p-10 text-center">
          <p className="font-display text-2xl text-white/60">Aucun combat ici</p>
          <p className="mt-2 text-sm text-white/50">
            Changez de filtre ou lancez un nouveau combat.
          </p>
        </Panel>
      )}
    </div>
  );
}
