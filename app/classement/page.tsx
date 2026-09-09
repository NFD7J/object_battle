import type { Metadata } from "next";

import { PlayerAvatar, RankingTable } from "@/components/ranking-table";
import { PageHeader, Panel, SectionTitle, Tag } from "@/components/ui";
import { currentPlayer, players } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Classement",
  description:
    "Le classement des joueurs d'Object Battle, triable par score, nombre de victoires ou taux de victoire.",
};

/** Ordre d'affichage du podium : 2e à gauche, 1er au centre, 3e à droite. */
const ORDRE_PODIUM = [1, 0, 2];

const HAUTEURS = ["h-28", "h-40", "h-20"];

export default function ClassementPage() {
  const parPoints = [...players].sort((a, b) => b.points - a.points);
  const podium = ORDRE_PODIUM.map((index) => ({
    player: parPoints[index],
    rang: index + 1,
  })).filter((entree) => Boolean(entree.player));

  return (
    <>
      <PageHeader
        eyebrow="Hall of fame"
        title="Classement"
        subtitle="Les meilleurs parieurs d'Object Battle. Le classement se trie par score, par nombre de victoires ou par taux de réussite."
      />

      {/* ------------------------------------------------------------------ */}
      {/* Podium                                                              */}
      {/* ------------------------------------------------------------------ */}
      <section
        aria-labelledby="titre-podium"
        className="relative overflow-hidden border-b border-edge bg-abyss"
      >
        <div aria-hidden="true" className="arena-grid absolute inset-0 opacity-30" />
        <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <h2 id="titre-podium" className="sr-only">
            Podium
          </h2>

          <ol className="flex items-end justify-center gap-3 sm:gap-6">
            {podium.map(({ player, rang }, position) => (
              <li key={player.id} className="flex-1 text-center sm:max-w-48">
                <PlayerAvatar player={player} size={rang === 1 ? 72 : 56} />
                <p className="mt-3 truncate font-display text-xl text-white sm:text-2xl">
                  {player.username}
                </p>
                <p className="font-mono text-sm font-bold text-arcade-gold tabular-nums">
                  {player.points.toLocaleString("fr-FR")} pts
                </p>

                <div
                  className={`mt-3 grid ${HAUTEURS[position]} cut-corner-sm place-items-center border-t-2 ${
                    rang === 1
                      ? "border-arcade-gold bg-linear-to-b from-arcade-gold/30 to-transparent"
                      : rang === 2
                        ? "border-white/60 bg-linear-to-b from-white/15 to-transparent"
                        : "border-arcade-orange bg-linear-to-b from-arcade-orange/25 to-transparent"
                  }`}
                >
                  <span className="font-display text-4xl text-white sm:text-5xl">
                    {rang}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Tableau complet                                                     */}
      {/* ------------------------------------------------------------------ */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <SectionTitle>Tous les joueurs</SectionTitle>
        <RankingTable players={players} currentPlayerId={currentPlayer.id} />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Rappel de la position du joueur                                     */}
      {/* ------------------------------------------------------------------ */}
      <section aria-labelledby="titre-ma-place" className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <h2 id="titre-ma-place" className="sr-only">
          Votre position
        </h2>
        <Panel tone="violet" innerClassName="flex flex-wrap items-center gap-4 p-5">
          <PlayerAvatar player={currentPlayer} size={48} />
          <div className="min-w-0 flex-1">
            <Tag className="bg-arcade-violet/25 text-arcade-cyan">Votre position</Tag>
            <p className="mt-2 font-display text-2xl text-white">
              {parPoints.findIndex((player) => player.id === currentPlayer.id) + 1}
              <sup className="text-sm">e</sup> sur {players.length} joueurs
            </p>
          </div>
          <p className="text-right">
            <span className="block font-mono text-2xl font-bold text-arcade-gold tabular-nums">
              {currentPlayer.points.toLocaleString("fr-FR")}
            </span>
            <span className="block font-mono text-[10px] tracking-widest text-white/40 uppercase">
              points
            </span>
          </p>
        </Panel>
      </section>
    </>
  );
}
