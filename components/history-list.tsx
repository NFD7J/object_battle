"use client";

import { useState, type ReactNode } from "react";

import { FightRow } from "@/components/fight-row";
import { Panel } from "@/components/ui";
import { useGame } from "@/lib/game-store";
import { Fight } from "@/lib/types";

type Filtre = "tous" | "gain" | "perte";

const FILTRES: { key: Filtre; label: string }[] = [
  { key: "tous", label: "Tous les combats" },
  { key: "gain", label: "Paris gagnés" },
  { key: "perte", label: "Paris perdus" },
];

/** Longueur d'affichage : un nombre de lignes, ou tout l'historique. */
export type ChoixLimite = number | "tout";

/** Bouton de la barre d'options, partagé par les filtres et le sélecteur. */
function BoutonBarre({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`tag-slant px-4 py-2 font-mono text-xs tracking-[0.14em] uppercase transition-colors ${
        actif
          ? "bg-linear-to-r from-arcade-violet to-arcade-blue font-bold text-white"
          : "bg-panel text-white/60 hover:bg-panel-soft hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

/** Résumé chiffré de l'historique, branché sur le solde live. */
export function HistoriqueResume({ fights: fightsProp }: { fights?: Fight[] } = {}) {
  const { fights: fightsStore } = useGame();
  const fights = fightsProp ?? fightsStore;
  const nbGains = fights.filter((fight) => fight.bet?.outcome === "gain").length;
  const nbPertes = fights.filter((fight) => fight.bet?.outcome === "perte").length;

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
  limitOptions,
  combatantId,
  filtres = true,
  emptyTitle = "Aucun combat ici",
  emptyText = "Changez de filtre ou lancez un nouveau combat.",
  fights: fightsProp,
}: {
  compact?: boolean;
  /** Nombre de lignes affichées. Avec `limitOptions`, c'est le choix initial. */
  limit?: number;
  /** Longueurs proposées au lecteur. Absent : la liste garde `limit` en dur. */
  limitOptions?: ChoixLimite[];
  combatantId?: number;
  filtres?: boolean;
  emptyTitle?: string;
  emptyText?: string;
  fights?: Fight[];
}) {
  const { fights: fightsStore } = useGame();
  const fights = fightsProp ?? fightsStore;
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [limiteChoisie, setLimiteChoisie] = useState<ChoixLimite>( limit ?? limitOptions?.[0] ?? "tout");

  // Sans sélecteur, la longueur reste celle imposée par la page appelante.
  const limiteActive = limitOptions?.length ? limiteChoisie : limit;

  let liste = fights;
  if (combatantId != null) {
    liste = liste.filter(
      (fight) => fight.fighterA.id === combatantId || fight.fighterB.id === combatantId,
    );
  }
  if (filtre !== "tous") {
    liste = liste.filter((fight) => fight.bet?.outcome === filtre);
  }
  // Le total avant coupe : c'est lui qui dit si « Tout » change quelque chose.
  const nbTotal = liste.length;
  if (limiteActive != null && limiteActive !== "tout") {
    liste = liste.slice(0, limiteActive);
  }

  return (
    <div>
      {filtres || limitOptions?.length ? (
        <div className="mb-6 flex flex-wrap items-center justify-end gap-x-6 gap-y-3">
          {filtres ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer l'historique">
              {FILTRES.map((option) => (
                <BoutonBarre
                  key={option.key}
                  actif={filtre === option.key}
                  onClick={() => setFiltre(option.key)}
                >
                  {option.label}
                </BoutonBarre>
              ))}
            </div>
          ) : null}

          {limitOptions?.length ? (
            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-label="Nombre de combats affichés"
            >
              <span className="font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase">
                Afficher
              </span>
              {limitOptions.map((option) => (
                <BoutonBarre
                  key={String(option)}
                  actif={limiteChoisie === option}
                  onClick={() => setLimiteChoisie(option)}
                >
                  {option === "tout" ? "Tout" : option}
                </BoutonBarre>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {liste.length} combats affichés sur {nbTotal}.
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
