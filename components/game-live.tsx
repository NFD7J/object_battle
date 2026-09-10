"use client";

import Link from "next/link";

import { PlayerAvatar } from "@/components/ranking-table";
import { Panel } from "@/components/ui";
import { useGame, useJoueurs } from "@/lib/game-store";

/** Compteurs de la bannière d'accueil, avec le nombre de combats à jour. */
export function HeroStats({ nbObjets }: { nbObjets: number }) {
  const { fights, joueurs } = useGame();

  return (
    <dl className="mt-10 grid max-w-lg grid-cols-3 gap-3">
      {[
        { valeur: nbObjets, label: "Objets" },
        { valeur: fights.length, label: "Combats" },
        { valeur: joueurs.length, label: "Joueurs" },
      ].map((item) => (
        <div
          key={item.label}
          className="cut-corner-sm border border-edge bg-panel/80 px-4 py-3"
        >
          <dt className="font-mono text-[10px] tracking-[0.16em] text-white/50 uppercase">
            {item.label}
          </dt>
          <dd className="font-display text-3xl leading-none text-arcade-gold tabular-nums">
            {item.valeur}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Aperçu du classement, recalculé après chaque pari. */
export function TopPlayersPreview({ limit = 4 }: { limit?: number }) {
  const joueurs = useJoueurs();
  const topJoueurs = [...joueurs].sort((a, b) => b.points - a.points).slice(0, limit);

  if (topJoueurs.length === 0) {
    return (
      <p className="relative mt-5 text-sm text-white/55">
        Aucun joueur classé pour le moment. Créez un compte pour apparaître ici.
      </p>
    );
  }

  return (
    <ol className="relative mt-5 grid gap-2.5">
      {topJoueurs.map((player, index) => (
        <li
          key={player.id}
          className="cut-corner-sm flex items-center gap-3 border border-edge bg-panel/80 px-3 py-2.5"
        >
          <span
            aria-hidden="true"
            className="w-5 font-display text-2xl leading-none text-arcade-violet tabular-nums"
          >
            {index + 1}
          </span>
          <PlayerAvatar player={player} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-lg leading-tight text-white">
              {player.username}
            </span>
            <span className="block font-mono text-[11px] text-white/50">
              {player.nbVictoires} victoires
            </span>
          </span>
          <span className="text-right">
            <span className="block font-mono text-base font-bold text-arcade-gold tabular-nums">
              {player.points.toLocaleString("fr-FR")}
            </span>
            <span className="block font-mono text-[9px] tracking-widest text-white/40 uppercase">
              points
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function TopPlayersPanel() {
  return (
    <Panel tone="violet" innerClassName="relative overflow-hidden p-6 sm:p-8">
      <div aria-hidden="true" className="arena-grid absolute inset-0 opacity-60" />

      <div className="relative flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] tracking-[0.3em] text-arcade-cyan uppercase">
          Classement
        </p>
        <Link
          href="/classement"
          className="font-mono text-[11px] tracking-[0.14em] text-arcade-cyan uppercase underline-offset-4 hover:underline"
        >
          Voir tout →
        </Link>
      </div>

      <h2 className="skew-title relative mt-3 text-3xl">Meilleurs joueurs</h2>
      <TopPlayersPreview />
    </Panel>
  );
}
