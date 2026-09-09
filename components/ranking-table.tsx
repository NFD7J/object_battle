"use client";

import { useState } from "react";

import { Panel } from "@/components/ui";
import type { Player, RankingSort } from "@/lib/types";

const SORTS: { key: RankingSort; label: string }[] = [
  { key: "points", label: "Score" },
  { key: "victoires", label: "Victoires" },
  { key: "ratio", label: "Taux de victoire" },
];

/** Taux de victoire arrondi, pour l'affichage uniquement. */
function winRate(player: Player): number {
  if (player.nbCombats === 0) return 0;
  return Math.round((player.nbVictoires / player.nbCombats) * 100);
}

function sortPlayers(players: Player[], sort: RankingSort): Player[] {
  const copy = [...players];
  if (sort === "victoires") return copy.sort((a, b) => b.nbVictoires - a.nbVictoires);
  if (sort === "ratio") return copy.sort((a, b) => winRate(b) - winRate(a));
  return copy.sort((a, b) => b.points - a.points);
}

/** Pastille de rang : or, argent, bronze, puis numéro simple. */
function RankBadge({ rank }: { rank: number }) {
  const medals: Record<number, string> = {
    1: "bg-arcade-gold text-void",
    2: "bg-white/70 text-void",
    3: "bg-arcade-orange text-void",
  };

  return (
    <span
      className={`grid h-9 w-9 -skew-x-6 place-items-center font-display text-lg tabular-nums ${
        medals[rank] ?? "bg-panel-soft text-white/70"
      }`}
    >
      <span className="skew-x-6">{rank}</span>
    </span>
  );
}

/** Pastille d'avatar : initiale du pseudo sur la couleur du joueur. */
export function PlayerAvatar({ player, size = 40 }: { player: Player; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full font-display text-lg text-void"
      style={{
        width: size,
        height: size,
        backgroundColor: player.avatarColor,
        fontSize: size * 0.45,
      }}
    >
      {player.username.charAt(0).toUpperCase()}
    </span>
  );
}

export function RankingTable({
  players,
  currentPlayerId,
}: {
  players: Player[];
  currentPlayerId?: number;
}) {
  const [sort, setSort] = useState<RankingSort>("points");
  const sorted = sortPlayers(players, sort);

  return (
    <div>
      {/* Choix du critère de tri (§4.4) */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span
          id="tri-label"
          className="mr-1 font-mono text-xs tracking-[0.16em] text-white/50 uppercase"
        >
          Trier par
        </span>
        <div role="group" aria-labelledby="tri-label" className="flex flex-wrap gap-2">
          {SORTS.map((option) => {
            const active = sort === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setSort(option.key)}
                aria-pressed={active}
                className={`tag-slant px-4 py-2 font-mono text-xs tracking-[0.14em] uppercase transition-colors ${
                  active
                    ? "bg-linear-to-r from-arcade-violet to-arcade-blue font-bold text-white"
                    : "bg-panel text-white/60 hover:bg-panel-soft hover:text-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <Panel innerClassName="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <caption className="sr-only">
            Classement des joueurs, trié par{" "}
            {SORTS.find((option) => option.key === sort)?.label}
          </caption>
          <thead>
            <tr className="border-b border-edge bg-panel-soft">
              <th scope="col" className="p-3 font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase">
                Rang
              </th>
              <th scope="col" className="p-3 font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase">
                Joueur
              </th>
              <th scope="col" className="p-3 text-right font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase">
                Score
              </th>
              <th scope="col" className="p-3 text-right font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase">
                Victoires
              </th>
              <th scope="col" className="p-3 text-right font-mono text-[11px] tracking-[0.14em] text-white/50 uppercase">
                Taux
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((player, index) => {
              const isCurrent = player.id === currentPlayerId;
              return (
                <tr
                  key={player.id}
                  className={`border-b border-edge/50 last:border-0 ${
                    isCurrent ? "bg-arcade-violet/10" : "hover:bg-panel-soft/60"
                  }`}
                >
                  <td className="p-3">
                    <RankBadge rank={index + 1} />
                  </td>
                  <th scope="row" className="p-3 font-normal">
                    <span className="flex items-center gap-3">
                      <PlayerAvatar player={player} size={36} />
                      <span className="font-display text-lg tracking-wide text-white">
                        {player.username}
                      </span>
                      {isCurrent ? (
                        <span className="tag-slant bg-arcade-violet px-2 py-0.5 font-mono text-[10px] tracking-widest text-white uppercase">
                          Vous
                        </span>
                      ) : null}
                    </span>
                  </th>
                  <td className="p-3 text-right font-mono font-bold text-arcade-gold tabular-nums">
                    {player.points.toLocaleString("fr-FR")}
                  </td>
                  <td className="p-3 text-right font-mono text-white/80 tabular-nums">
                    {player.nbVictoires}
                  </td>
                  <td className="p-3 text-right font-mono text-white/80 tabular-nums">
                    {winRate(player)} %
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
