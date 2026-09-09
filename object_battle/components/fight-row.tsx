import Link from "next/link";

import { CombatantPortrait } from "@/components/combatant-card";
import { Panel, Tag } from "@/components/ui";
import { formatFightDate } from "@/lib/mock-data";
import type { Combatant, Fight } from "@/lib/types";

/** Le camp gagnant, ou null en cas de match nul. */
function winnerOf(fight: Fight): Combatant | null {
  if (fight.winnerId === null) return null;
  return fight.winnerId === fight.fighterA.id ? fight.fighterA : fight.fighterB;
}

/** Bandeau de gain ou de perte : couleur + flèche + mot, jamais la couleur seule. */
export function BetResult({ fight }: { fight: Fight }) {
  const { outcome, delta, amount } = fight.bet;

  const styles = {
    gain: { className: "bg-victory/15 text-victory", arrow: "\u25B2", label: "Gain" },
    perte: { className: "bg-defeat/15 text-defeat", arrow: "\u25BC", label: "Perte" },
    nul: { className: "bg-draw/15 text-draw", arrow: "\u25AC", label: "Mise rendue" },
  }[outcome];

  return (
    <span
      className={`flex -skew-x-6 items-center gap-2 px-3 py-1.5 ${styles.className}`}
    >
      <span aria-hidden="true" className="skew-x-6 text-xs">
        {styles.arrow}
      </span>
      <span className="skew-x-6 font-mono text-xs tracking-wider uppercase">
        {styles.label}
      </span>
      <span className="skew-x-6 font-display text-lg leading-none tabular-nums">
        {delta > 0 ? `+${delta}` : delta}
      </span>
      <span className="sr-only">points, pour une mise de {amount} points</span>
    </span>
  );
}

/** Une ligne d'historique de combat (§4.5), réutilisée sur l'accueil. */
export function FightRow({ fight, compact = false }: { fight: Fight; compact?: boolean }) {
  const winner = winnerOf(fight);

  return (
    <Panel innerClassName="p-4 sm:p-5">
      <article className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Les deux combattants */}
        <div className="flex items-center gap-3">
          <CombatantPortrait
            combatant={fight.fighterA}
            className="h-16 w-16 shrink-0 cut-corner-sm"
            sizes="64px"
          />
          <span
            aria-hidden="true"
            className="skew-title font-display text-xl text-arcade-orange"
          >
            VS
          </span>
          <CombatantPortrait
            combatant={fight.fighterB}
            className="h-16 w-16 shrink-0 cut-corner-sm"
            sizes="64px"
          />
        </div>

        {/* Resultat */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl leading-tight">
            <Link
              href={`/objets/${fight.fighterA.slug}`}
              className="hover:text-arcade-cyan"
            >
              {fight.fighterA.name}
            </Link>
            <span className="mx-2 text-white/40">vs</span>
            <Link
              href={`/objets/${fight.fighterB.slug}`}
              className="hover:text-arcade-cyan"
            >
              {fight.fighterB.name}
            </Link>
          </h3>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {winner ? (
              <span className="text-victory">
                <span aria-hidden="true">&#9733;</span> Vainqueur :{" "}
                <strong className="font-bold">{winner.name}</strong>
              </span>
            ) : (
              <span className="text-draw">
                <span aria-hidden="true">&#9776;</span> Match nul
              </span>
            )}
            <span className="font-mono text-white/70 tabular-nums">
              {fight.scoreA} / {fight.scoreB}
            </span>
          </p>

          {!compact ? (
            <p className="mt-2">
              <Tag className="bg-panel-soft text-white/50">
                <time dateTime={fight.createdAt}>{formatFightDate(fight.createdAt)}</time>
              </Tag>
            </p>
          ) : null}
        </div>

        <div className="sm:shrink-0">
          <BetResult fight={fight} />
          {compact ? (
            <p className="mt-2 text-right font-mono text-[11px] text-white/40">
              <time dateTime={fight.createdAt}>{formatFightDate(fight.createdAt)}</time>
            </p>
          ) : null}
        </div>
      </article>
    </Panel>
  );
}
